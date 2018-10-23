const fs = require('fs');
const prompts = require('prompts')
const optimizely = require('@optimizely/optimizely-sdk');
const datafile = require('./datafile.json')
const userProfiles = require('./userProfiles.json')

const EXPERIMENT_KEY = 'checkout_flow_test'
const userProfile = {}
const userProfileService ={
  lookup: function(userId, cb) {
    //console.log('looked up', userProfiles[userId])

    cb(null, userProfiles[userId])
  },
  save: function(res) {
    //return
    profiles = JSON.parse(fs.readFileSync('userProfiles.json')) || {}
    profiles[res.user_id] = res
    fs.writeFileSync('userProfiles.json', JSON.stringify(profiles, null, '  '), 'utf8')
  }
}
const client = optimizely.createInstance({
  datafile,
  userProfileService,
});


;(async function() {
  //const values = await prompts({
    //type: 'text',
    //name: 'userId',
    //message: 'User ID',
  //})

  for (var i = 0; i < 5; i++) {
    const n = `jordan-${i}`
    client.activateWithUserProfileService(EXPERIMENT_KEY, n, {}, function(err, res) {

      console.log(n, res)
    })
  }


})();
