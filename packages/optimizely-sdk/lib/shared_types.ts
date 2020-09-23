export type UserAttributes = {
  // TODO[OASIS-6649]: Don't use any type
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  [name: string]: any;
}

export interface Variation {
  id: string;
  key: string;
}

export interface Experiment {
  id: string;
  key: string;
  status: string;
  layerId: string;
  variations: Variation[];
  trafficAllocation: Array<{
    entityId: string;
    endOfRange: number;
  }>;
  audienceIds: string[];
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  forcedVariations: object;
}

// Information about past bucketing decisions for a user.
export interface UserProfile {
  user_id: string;
  experiment_bucket_map: {
    [experiment_id: string]: {
        variation_id: string;
    };
  };
}

export interface UserProfileService {
  lookup(userId: string): UserProfile;
  save(profile: UserProfile): void;
}
