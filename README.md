# polkaRelCheck
Monitors paritytech/polkadot for new releases and updates binaries automatically
PGP Signer checks. In accordance with best practice, these are validated prior to enabling executable permission on the binary. 

Additionally, we added a ".config" file. Should you be having difficulties with the checks, you may set "ignoreSecurity: true" which will allow for failing checks to complete.


**We recommend that you test this manually next polkadot release to make sure it has all the proper privileges to do what it needs to**

Setup Instructions:

1. git clone this repo
2. cd polkaRelCheck
3. npm install


Run as follows: 
npm start [working directory with current polkadot binary] [systemctl service name]

example: "npm start /my/dir/polkadot/target/release/ polkadot.service"

set this as a crontab entry. The below runs every 30 minutes and logs out to prc_logs.log

#crontab -e

*/30 * * * * cd /my/dir/polkaRelCheck && /usr/bin/npm start /my/dir/polkadot/target/release/ polkadot.service >> prc_logs.log



Prequisites:
1. gpg command line and Node 14 LTS
2. Expects a late version of the polkadot binary to be present. Location provided in command line (argv[3])
3. Expects a systemctl serviice running polkadot as a service to restart when upgrade completes. Name provided in command line (argv[4])

An example of a polkadot.service file is included in the extras folder

Libraries used: axios, fs, semver, execa, dayjs

**Tips always appreciated**

- KSM: Dw9DAWiFr2WbptxSsR78A2be71Rps125UxQowcF4jZ6GEZo

- DOT: 1GPiqrHHuwHuz6QjQm66n8YSGmMhVsrnMbVtYTqYR6ZA9aH


