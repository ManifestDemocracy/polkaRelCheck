# polkaRelCheck
Monitors paritytech/polkadot for new releases and updates binaries automatically

**We recommend that you test this manually next polkadot release to make sure it has all the proper privileges to do what it needs to**

Setup Instructions:
git clone this repo
cd polkaRelCheck
npm install
Run as follows: 
npm start [working directory with current polkadot binary] [systemctl service name]

example: "npm start /my/dir/polkadot/target/release/ polkadot.service"

set this as a crontab entry. The below runs every 30 minutes and logs out to prc_logs.log
#crontab -e

*/30 * * * * cd /my/dir/polkaRelCheck && /usr/bin/npm start /my/dir/polkadot/target/release/ polkadot.service >> prc_logs.log



Prequisites:
1. git and Node 14 LTS
2. A polkadot binary is running
3. Polkadot is running as a service managed by systemctl.

An example of a polkadot.service file is included in the extras folder

Libraries used: axios, fs, semver, execa


