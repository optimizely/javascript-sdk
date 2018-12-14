function createFeature(key) {
  const body = {
    archived: false,
    api_name: key,
    description: '',
    variables: [],
    project_id: 12122640456,
    environments: {
      production: {
        id: 12107660070,
        is_primary: true,
        rollout_rules: [
          { status: 'running', audience_ids: [], percentage_included: 7500 },
        ],
      },
    },
  }
  fetch('https://app.optimizely.com/api/v1/projects/12122640456/feature_flags', {
    credentials: 'include',
    headers: {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'x-csrf-token': '2b11b22ce70f2204c08fe971b7afea3dedd2c1651b94f348f469ef7df4e0d007',
      'x-requested-with': 'XMLHttpRequest',
    },
    referrer: 'https://app.optimizely.com/v2/projects/12122640456/features',
    referrerPolicy: 'origin-when-cross-origin',
    body: JSON.stringify(body),
    method: 'POST',
    mode: 'cors',
  })
}

const featureFlags = [
  'rebrand',
  'new_search_algo',
  'ads',
  'infinite_scroll',
  'oauth_flow',
  'deep_learning',
  'self_driving_cars',
  'expensive_pricing',
  'cheap_pricing',
  'tabby_cats',
  'big_data',
  'small_data',
  'microservices',
  'go_lang',
  'rest_api_v2',
  'reactify',
  'single_page_app',
].map(createFeature)