const fs = require('fs')
const axios = require('axios')
const execa = require('execa');
const semverSort = require('semver/functions/sort')
const semverGt = require('semver/functions/gt')

async function polkaRelCheck(){
    var regExVer = new RegExp(/\d{1,2}\.\d{1,2}\.\d{1,2}/gm)
    var polkaDir = process.argv[2]
    var polkaServiceName = process.argv[3]
    try {
        if (fs.existsSync(`${polkaDir}/polkadot`)){
            var {stdout} = await execa.command(`./polkadot --version`,{cwd: polkaDir})
            var localCurrent = `v${stdout.match(regExVer)}`
            console.log(`Local current version of polkadot is: ${localCurrent}`)
        } else {
            console.log(`No polkadot file exists in ${polkaDir}`)
            process.exit(1)
        }

    } catch (err){
        console.log(`Get local polkadot version failed: ${err}`)
        process.exit(2)
    }
    const axOpts = {
        method: 'get',
        url: 'https://api.github.com/repos/paritytech/polkadot/releases'
      };
    var polkaRels = await axios(axOpts).then(async (response) => {
        return response.data
    }).catch(err => console.log('releases', err))
    try {
        var relTags = polkaRels.map(x => x.tag_name)
        relTags = await semverSort(relTags)
        var newCurrent = relTags[relTags.length-1]
        console.log(`${newCurrent} is newer than ${localCurrent}? ${semverGt(newCurrent, localCurrent)}`)
    } catch(err){
        console.log(err)
    }
    if(semverGt(newCurrent, localCurrent)){
        var newRelease = polkaRels.filter(x=>x.tag_name == newCurrent)
        newRelease = newRelease[0]
        var assetUrl = newRelease.assets.filter(x=>x.name == 'polkadot')
        assetUrl = assetUrl[0].browser_download_url
        console.log('Download URL for new binary',assetUrl)
        try {
            if (await fs.existsSync(`${polkaDir}/__polkadot`)) {
                var {stdout} = await execa.command(`rm --force ${polkaDir}/__polkadot`)
                console.log('deleting old backup polkadot binary',stdout)
            }
            try {
                var {stdout} = await execa.command(`mv ${polkaDir}/polkadot ${polkaDir}/__polkadot`)
                console.log('renaming current polkadot binary to "__polkadot"',stdout)
                var {stdout} = await execa.command(`chmod -x ${polkaDir}/__polkadot`)
                console.log('removing execution permissions on old binary "__polkadot"',stdout)
                var {stdout} = await execa.command(`curl -L ${assetUrl} -o ${polkaDir}/polkadot`)
                console.log(`downloading new polkadot binary version: ${newCurrent}`,stdout)
                var {stdout} = await execa.command(`chmod +x ${polkaDir}/polkadot`)
                console.log('adding execution permission to new polkadot binary',stdout)
            } catch (err){
                console.log('Moving binaries, changing permission, downloading new binary',err)
            }

            try {
                var {stdout} = await execa.command(`sudo systemctl daemon-reload`)
                console.log('reloading systemctl daemon',stdout)
                var {stdout} = await execa.command(`sudo systemctl restart ${polkaServiceName}`)
                console.log('restarting polkadot service via systemctl',stdout)
                var {stdout} = await execa.command(`./polkadot --version`,{cwd: polkaDir})
                var localCurrent = stdout.match(regExVer)
                console.log(`Now running polkadot version: ${localCurrent}`)
            } catch (err) {
                console.log('Systemctl functions failed', err)
            }

        } catch (err) {
            console.log(err)
        }
            process.exit()
    } else {
        console.log('No new releases', new Date(Date.now()).toLocaleString())
    }
}

polkaRelCheck()