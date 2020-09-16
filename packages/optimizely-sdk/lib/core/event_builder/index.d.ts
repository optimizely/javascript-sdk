/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

declare module '@optimizely/optimizely-sdk/lib/core/event_builder' {
    import { ProjectConfig } from '@optimizely/optimizely-sdk/lib/core/project_config';
    import { LogHandler } from '@optimizely/js-sdk-logging';
    import { Event as TrackEvent } from '@optimizely/optimizely-sdk';
    interface Options {
        // TODO[OASIS-6649]: Don't use object type
        // eslint-disable-next-line  @typescript-eslint/ban-types
        attributes: Object;
        clientEngine: string;
        clientVersion: string;
        configObj: ProjectConfig;
        eventKey: string;
        logger: LogHandler;
        userId: string;
    }

    interface Event {
        entity_id: string;
        timestamp: number;
        key: string;
        uuid: string;
    }

    interface Decision {
        campaign_id: string;
        experiment_id: string;
        variation_id: string;
    }

    interface ImpressionEvent {
        decisions: Decision[];
        events: Event[];
    }

    interface CommonParams {
        account_id: string;
        project_id: string;
        visitors: Array<{
            snapshot: unknown[];
            visitor_id: string;
            attributes: Array<{
                entity_id: string;
                key: string;
                type: string;
                value: boolean;
            }>
        }>
        revision: string;
        client_name: string;
        client_version: string;
        anonymize_ip:boolean;
        enrich_decisions: boolean;
    }

    export interface EventBuilder {
        getCommonEventParams(options: Options): CommonParams
        getConversionEvent(options: Options): TrackEvent
        getImpressionEventParams(configObj: ProjectConfig, experimentId: string, variationId: string): ImpressionEvent
        // TODO[OASIS-6649]: Don't use object type
        // eslint-disable-next-line  @typescript-eslint/ban-types
        getImpressionEvent(options: Options): TrackEvent
        // TODO[OASIS-6649]: Don't use object type
        // eslint-disable-next-line  @typescript-eslint/ban-types
        getVisitorSnapshot(configObj: ProjectConfig, eventKey: string, eventTags: Object, logger: LogHandler): {[events: string]: Event[]}
    }
}

