/**
 * Generates a large V4 datafile for performance testing of project config parsing.
 *
 * Usage:
 *   import { generatePerfDatafile } from './perf_datafile_generator';
 *   const datafile = generatePerfDatafile();               // default sizes
 *   const datafile = generatePerfDatafile({ experiments: 500, featureFlags: 200 }); // custom
 */

interface PerfDatafileOptions {
  attributes?: number;
  audiences?: number;
  typedAudiences?: number;
  events?: number;
  experiments?: number;
  groups?: number;
  experimentsPerGroup?: number;
  rollouts?: number;
  experimentsPerRollout?: number;
  variationsPerExperiment?: number;
  featureFlags?: number;
  variablesPerFeature?: number;
  experimentIdsPerFeature?: number;
  /** When set, each feature gets its own rollout with this many experiments (overrides rollouts/experimentsPerRollout). */
  rolloutExperimentsPerFeature?: number;
  /** Variations per rollout experiment (default: 1). Only used with rolloutExperimentsPerFeature. */
  rolloutVariationsPerExperiment?: number;
  integrations?: number;
  holdouts?: number;
  localHoldouts?: number;
}

const DEFAULTS: Required<PerfDatafileOptions> = {
  attributes: 50,
  audiences: 50,
  typedAudiences: 50,
  events: 100,
  experiments: 200,
  groups: 10,
  experimentsPerGroup: 5,
  rollouts: 100,
  experimentsPerRollout: 3,
  variationsPerExperiment: 3,
  featureFlags: 100,
  variablesPerFeature: 5,
  experimentIdsPerFeature: 2,
  rolloutExperimentsPerFeature: 0,
  rolloutVariationsPerExperiment: 1,
  integrations: 3,
  holdouts: 5,
  localHoldouts: 5,
};

let idCounter = 1000000;
const nextId = () => String(++idCounter);

function makeTrafficAllocation(entityIds: string[]): Array<{ entityId: string; endOfRange: number }> {
  const sliceSize = Math.floor(10000 / entityIds.length);
  return entityIds.map((entityId, i) => ({
    entityId,
    endOfRange: i === entityIds.length - 1 ? 10000 : sliceSize * (i + 1),
  }));
}

function makeVariations(count: number, withVariables: boolean, variableIds?: string[]) {
  const variations = [];
  for (let i = 0; i < count; i++) {
    const id = nextId();
    const variation: Record<string, unknown> = {
      id,
      key: `variation_${id}`,
      featureEnabled: i === 0,
    };
    if (withVariables && variableIds) {
      variation.variables = variableIds.map(varId => ({
        id: varId,
        value: `value_${varId}_var${i}`,
      }));
    } else {
      variation.variables = [];
    }
    variations.push(variation);
  }
  return variations;
}

function makeExperiment(
  opts: {
    variationCount: number;
    audienceIds?: string[];
    withVariables?: boolean;
    variableIds?: string[];
    status?: string;
  }
) {
  const id = nextId();
  const variations = makeVariations(
    opts.variationCount,
    opts.withVariables ?? false,
    opts.variableIds,
  );
  return {
    id,
    key: `experiment_${id}`,
    status: opts.status ?? 'Running',
    layerId: nextId(),
    forcedVariations: {},
    audienceIds: opts.audienceIds ?? [],
    audienceConditions: opts.audienceIds?.length
      ? ['or', ...opts.audienceIds]
      : [],
    trafficAllocation: makeTrafficAllocation(variations.map(v => v.id)),
    variations,
  };
}

export function generatePerfDatafile(options?: PerfDatafileOptions) {
  const o = { ...DEFAULTS, ...options };
  idCounter = 1000000;

  // --- Attributes ---
  const attributes = [];
  for (let i = 0; i < o.attributes; i++) {
    const id = nextId();
    attributes.push({ id, key: `attr_${id}` });
  }

  // --- Audiences (string-encoded conditions) ---
  const audiences = [];
  for (let i = 0; i < o.audiences; i++) {
    const id = nextId();
    const attrKey = attributes[i % attributes.length].key;
    audiences.push({
      id,
      name: `audience_${id}`,
      conditions: JSON.stringify([
        'and',
        ['or', ['or', { type: 'custom_attribute', name: attrKey, match: 'exact', value: `val_${i}` }]],
      ]),
    });
  }

  // --- Typed Audiences (parsed conditions) ---
  const typedAudiences = [];
  for (let i = 0; i < o.typedAudiences; i++) {
    const id = nextId();
    const attrKey = attributes[i % attributes.length].key;
    typedAudiences.push({
      id,
      name: `typed_audience_${id}`,
      conditions: [
        'and',
        ['or', ['or', { type: 'custom_attribute', name: attrKey, match: 'exact', value: `typed_val_${i}` }]],
      ],
    });
  }

  const allAudienceIds = audiences.map(a => a.id);

  // --- Top-level experiments ---
  const experiments = [];
  for (let i = 0; i < o.experiments; i++) {
    const audId = allAudienceIds[i % allAudienceIds.length];
    experiments.push(
      makeExperiment({
        variationCount: o.variationsPerExperiment,
        audienceIds: [audId],
      })
    );
  }

  // --- Groups ---
  const groups = [];
  for (let i = 0; i < o.groups; i++) {
    const groupId = nextId();
    const groupExperiments = [];
    for (let j = 0; j < o.experimentsPerGroup; j++) {
      groupExperiments.push(
        makeExperiment({
          variationCount: o.variationsPerExperiment,
        })
      );
    }
    groups.push({
      id: groupId,
      policy: 'random',
      trafficAllocation: makeTrafficAllocation(groupExperiments.map(e => e.id)),
      experiments: groupExperiments,
    });
  }

  // --- Feature variables (shared pool for rollout/feature reuse) ---
  const variableTypes = [
    { type: 'boolean', defaultValue: 'false' },
    { type: 'integer', defaultValue: '100' },
    { type: 'double', defaultValue: '9.99' },
    { type: 'string', defaultValue: 'default_text' },
    { type: 'string', subType: 'json', defaultValue: '{"key":"value"}' },
  ];

  // --- Rollouts & Feature Flags ---
  const rollouts: Array<{ id: string; experiments: any[]; _variableIds: string[] }> = [];
  const featureFlags: Array<Record<string, unknown>> = [];
  const perFeatureRollout = o.rolloutExperimentsPerFeature > 0;

  if (!perFeatureRollout) {
    // Shared rollout pool (original behavior)
    for (let i = 0; i < o.rollouts; i++) {
      const rolloutId = nextId();
      const variableIds: string[] = [];
      for (let v = 0; v < o.variablesPerFeature; v++) {
        variableIds.push(nextId());
      }

      const rolloutExperiments = [];
      for (let j = 0; j < o.experimentsPerRollout; j++) {
        const isDefault = j === o.experimentsPerRollout - 1;
        rolloutExperiments.push(
          makeExperiment({
            variationCount: isDefault ? 1 : 2,
            audienceIds: isDefault ? [] : [allAudienceIds[i % allAudienceIds.length]],
            withVariables: true,
            variableIds,
            status: 'Running',
          })
        );
      }

      rollouts.push({ id: rolloutId, experiments: rolloutExperiments, _variableIds: variableIds });
    }
  }

  for (let i = 0; i < o.featureFlags; i++) {
    const featureId = nextId();

    const variableIds: string[] = [];
    let rolloutId: string;

    if (perFeatureRollout) {
      // Each feature gets its own dedicated rollout
      for (let v = 0; v < o.variablesPerFeature; v++) {
        variableIds.push(nextId());
      }

      const rolloutExps = [];
      for (let j = 0; j < o.rolloutExperimentsPerFeature; j++) {
        const isDefault = j === o.rolloutExperimentsPerFeature - 1;
        rolloutExps.push(
          makeExperiment({
            variationCount: isDefault ? 1 : o.rolloutVariationsPerExperiment,
            audienceIds: isDefault ? [] : (allAudienceIds.length > 0 ? [allAudienceIds[i % allAudienceIds.length]] : []),
            withVariables: true,
            variableIds,
            status: 'Running',
          })
        );
      }

      const rid = nextId();
      rollouts.push({ id: rid, experiments: rolloutExps, _variableIds: variableIds });
      rolloutId = rid;
    } else {
      const rollout = rollouts[i % rollouts.length];
      variableIds.push(...rollout._variableIds);
      rolloutId = rollout.id;
    }

    const variables = [];
    for (let v = 0; v < o.variablesPerFeature; v++) {
      const vType = variableTypes[v % variableTypes.length];
      const variable: Record<string, string> = {
        id: variableIds[v],
        key: `var_${v}_feat_${featureId}`,
        type: vType.type,
        defaultValue: vType.defaultValue,
      };
      if (vType.subType) {
        variable.subType = vType.subType;
      }
      variables.push(variable);
    }

    const experimentIds: string[] = [];
    for (let e = 0; e < o.experimentIdsPerFeature && e < experiments.length; e++) {
      const expIdx = (i * o.experimentIdsPerFeature + e) % experiments.length;
      experimentIds.push(experiments[expIdx].id);
    }

    featureFlags.push({
      id: featureId,
      key: `feature_${featureId}`,
      rolloutId,
      experimentIds,
      variables,
    });
  }

  // --- Events ---
  const events = [];
  for (let i = 0; i < o.events; i++) {
    const id = nextId();
    const refExps: string[] = [];
    for (let e = 0; e < 3 && e < experiments.length; e++) {
      refExps.push(experiments[(i * 3 + e) % experiments.length].id);
    }
    events.push({
      key: `event_${id}`,
      id,
      experimentIds: refExps,
    });
  }

  // --- Integrations ---
  const integrations = [];
  integrations.push({
    key: 'odp',
    host: 'https://api.zaius.com',
    publicKey: 'perf-test-key',
    pixelUrl: 'https://jumbe.zaius.com',
  });
  for (let i = 1; i < o.integrations; i++) {
    const id = nextId();
    integrations.push({
      key: `integration_${id}`,
    });
  }

  // --- Holdouts (global) ---
  const holdouts = [];
  for (let i = 0; i < o.holdouts; i++) {
    const id = nextId();
    const varId = nextId();
    holdouts.push({
      id,
      key: `holdout_${id}`,
      status: 'Running',
      includedFlags: [],
      excludedFlags: [],
      audienceIds: allAudienceIds.length > 0 ? [allAudienceIds[i % allAudienceIds.length]] : [],
      audienceConditions: allAudienceIds.length > 0
        ? ['or', allAudienceIds[i % allAudienceIds.length]]
        : [],
      variations: [{ id: varId, key: `holdout_var_${varId}`, variables: [] }],
      trafficAllocation: [{ entityId: varId, endOfRange: 5000 }],
    });
  }

  // --- Local Holdouts ---
  const localHoldouts = [];
  for (let i = 0; i < o.localHoldouts; i++) {
    const id = nextId();
    const varId = nextId();
    const ruleIds = experiments
      .slice(i * 2, i * 2 + 2)
      .map(e => e.id);
    if (ruleIds.length === 0) continue;

    localHoldouts.push({
      id,
      key: `local_holdout_${id}`,
      status: 'Running',
      includedFlags: [],
      excludedFlags: [],
      audienceIds: [],
      audienceConditions: [],
      includedRules: ruleIds,
      variations: [{ id: varId, key: `local_holdout_var_${varId}`, variables: [] }],
      trafficAllocation: [{ entityId: varId, endOfRange: 5000 }],
    });
  }

  // Clean internal helper fields from rollouts
  const cleanRollouts = rollouts.map(({ _variableIds, ...rest }) => rest);

  return {
    version: '4',
    accountId: 'perf_account',
    projectId: 'perf_project',
    revision: '1',
    sdkKey: 'perf-test-sdk-key',
    environmentKey: 'production',
    sendFlagDecisions: true,
    anonymizeIP: true,
    botFiltering: true,
    variables: [],
    attributes,
    audiences,
    typedAudiences,
    events,
    experiments,
    groups,
    rollouts: cleanRollouts,
    featureFlags,
    integrations,
    holdouts,
    localHoldouts,
  };
}

/**
 * Returns a summary of entity counts in a generated datafile.
 */
export function summarizeDatafile(datafile: ReturnType<typeof generatePerfDatafile>) {
  const groupExps = datafile.groups.reduce((sum, g) => sum + g.experiments.length, 0);
  const rolloutExps = datafile.rollouts.reduce((sum, r) => sum + r.experiments.length, 0);
  const totalExps = datafile.experiments.length + groupExps + rolloutExps;
  const totalVariations = totalExps * (datafile.experiments[0]?.variations?.length ?? 0);

  return {
    attributes: datafile.attributes.length,
    audiences: datafile.audiences.length,
    typedAudiences: datafile.typedAudiences.length,
    events: datafile.events.length,
    topLevelExperiments: datafile.experiments.length,
    groups: datafile.groups.length,
    groupExperiments: groupExps,
    rollouts: datafile.rollouts.length,
    rolloutExperiments: rolloutExps,
    totalExperiments: totalExps,
    estimatedTotalVariations: totalVariations,
    featureFlags: datafile.featureFlags.length,
    integrations: datafile.integrations.length,
    holdouts: datafile.holdouts.length,
    localHoldouts: datafile.localHoldouts.length,
  };
}
