###please manually check release v0.9.5 as the release tag and the binary version do not match (v0.9.5-3 is the binary version in v0.9.5)


# polkaRelCheck
As mentioned in [Dot Leap 40](https://newsletter.dotleap.com/p/dotleap-40), this tool monitors paritytech/polkadot for new releases and updates binaries automatically after validating SHA-256 and PGP Signature/Signer.
*In accordance with best practice, SHA-256 and PGP Signature are validated prior to enabling executable permission on the binary.*

**Please vote and show support:** Paradoxxx recently nominated this tool for a tip [on polkassembly](https://kusama.polkassembly.io/tip/0x1f81fc887a2255144cc18ebe260b89acb55b2870576659cd88b664bf94e08b91) or [on subscan](https://kusama.subscan.io/treasury_tip/0x1f81fc887a2255144cc18ebe260b89acb55b2870576659cd88b664bf94e08b91)

Additionally, we added a ".config" file. Should you be having difficulties with the checks, you may set "ignoreSecurity: true" which will allow for failing checks to complete. Or if the checks are failing due to dependencies, you make set {ignoreSecurity: "skip"} which bypasses them entirely.


![Screenshot of log](https://i.imgur.com/xbxZ4cV.png)

**We recommend that you test this manually next polkadot release to make sure it has all the proper privileges to do what it needs to**

Setup Instructions:

1. >`git clone https://github.com/ManifestDemocracy/polkaRelCheck.git`
2. >`cd polkaRelCheck`
3. >`npm install`


## How to run: 
>`npm start [working directory with current polkadot binary] [systemctl service name]`

**example:** 
>`npm start /my/dir/polkadot/target/release/ polkadot.service`

set this as a crontab entry. The below runs every 30 minutes and logs out to prc_logs.log

>`#crontab -e`

>`*/30 * * * * cd /my/dir/polkaRelCheck && /usr/bin/npm start /my/dir/polkadot/target/release/ polkadot.service >> prc_logs.log`

## Prequisites:

1. gpg command line and Node 14 LTS
2. Expects a late version of the polkadot binary to be present. Location provided in command line (argv[3])
3. Expects a systemctl serviice running polkadot as a service to restart when upgrade completes. Name provided in command line (argv[4])

An example of a polkadot.service file is included in the extras folder. 
Service files go in the /etc/systemd/system folder. 
Then run >```sudo systemctl enable [filname].service```

**Libraries used:** axios, fs, semver, execa, dayjs, PGP*
*PGP supplied by OS packages. use DNF, Yum, Apt etc.. to install if you dont have already*

## Want to test?
Download an older version of polkadot, use the working directory for that as the folder you input in the command line
Add a dummy systemctl service to round out the test

## Looking for a bash script?
This basically what the NodeJS code is doing under the hood
```
rm --force /home/cryptolunar/polkadot/target/release/__polka
mv /home/cryptolunar/polkadot/target/release/polkadot  /home/cryptolunar/polkadot/target/release/__polka
curl -sL https://github.com/paritytech/polkadot/releases/download/v0.9.2/polkadot -o /home/cryptolunar/polkadot/target/release/polkadot
sudo chmod +x /home/cryptolunar/polkadot/target/release/polkadot
sudo systemctl daemon-reload
sudo systemctl stop polkadot
sudo systemctl start polkadot
```

**Tips always appreciated**

- KSM: Dw9DAWiFr2WbptxSsR78A2be71Rps125UxQowcF4jZ6GEZo

- DOT: 1GPiqrHHuwHuz6QjQm66n8YSGmMhVsrnMbVtYTqYR6ZA9aH


