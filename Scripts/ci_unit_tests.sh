#!/bin/bash
# cannot use `set -e` because it is incompatible with nvm

# download nvm and load it
export NVM_DIR="`pwd`/.nvm" # truly local nvm install not needing sudo
mkdir -p $NVM_DIR
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 

function run_tests () {
  echo "Installing node" $1
  nvm install $1
  nvm exec $1 npm install
  response=$?
  if [[ $response != 0 ]]; then exit $response; fi
  nvm exec $1 npm test
  response=$?
  if [[ $response != 0 ]]; then exit $response; fi
}

# install node 5; run tests
run_tests 5

# install node 0.10; run tests
run_tests 0.10

# install node; run tests
run_tests node
