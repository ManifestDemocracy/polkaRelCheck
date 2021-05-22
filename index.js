const fs = require('fs')
const axios = require('axios')
const execa = require('execa');
const semverSort = require('semver/functions/sort')
const semverGt = require('semver/functions/gt')
var newCurrent

async function semCheck(loc_v, relList) {
    var relList_ = []
    do {
        var new_c = relList.pop()
        if(semverGt(new_c, loc_v)){
            newCurrent = new_c
            console.log( new Date(Date.now()).toLocaleString(), 'New version Released',new_c, loc_v)
            return true
        } else if (loc_v != new_c) {
            relList_.push(new_c)
        }
    } while (relList.length > 0)
    do {
        var new_c = relList_.shift()
        if(new_c.includes('-') && new_c.split('-')[0] == loc_v){
            newCurrent = new_c
            console.log( new Date(Date.now()).toLocaleString(), 'New Patch Release',new_c, loc_v)
            return true
        }
    } while (relList_.length > 0)
    return false
}

async function polkaRelCheck(){
    var regExVer = new RegExp(/\d{1,2}\.\d{1,2}\.\d{1,2}/gm)
    var polkaDir = process.argv[2]
    var polkaServiceName = process.argv[3]
    try {
        if (fs.existsSync(`${polkaDir}/polkadot`)){
            var {stdout} = await execa.command(`./polkadot --version`,{cwd: polkaDir})
            var localCurrent = `v${stdout.match(regExVer)}`
            console.log( new Date(Date.now()).toLocaleString() , `Local current version of polkadot is: ${localCurrent}`)
        } else {
            console.log( new Date(Date.now()).toLocaleString() , `No polkadot file exists in ${polkaDir}`)
            process.exit(1)
        }
    } catch (err){
        console.log( new Date(Date.now()).toLocaleString() , `Get local polkadot version failed: ${err}`)
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
    } catch(err){
        console.log( new Date(Date.now()).toLocaleString() , err)
    }
    if(await semCheck(localCurrent, semverSort(relTags))){
        var newRelease = polkaRels.filter(x=>x.tag_name == newCurrent)
        newRelease = newRelease[0]
        var assetUrl = newRelease.assets.filter(x=>x.name == 'polkadot')
        assetUrl = assetUrl[0].browser_download_url
        console.log( new Date(Date.now()).toLocaleString() , 'Download URL for new binary',assetUrl)
        try {
            if (await fs.existsSync(`${polkaDir}/__polkadot`)) {
                var {stdout} = await execa.command(`rm --force ${polkaDir}/__polkadot`)
                console.log( new Date(Date.now()).toLocaleString(), 'deleting old backup polkadot binary',stdout)
            }
            try {
                var {stdout} = await execa.command(`mv ${polkaDir}/polkadot ${polkaDir}/__polkadot`)
                console.log( new Date(Date.now()).toLocaleString() , 'renaming current polkadot binary to "__polkadot"',stdout)
                var {stdout} = await execa.command(`chmod -x ${polkaDir}/__polkadot`)
                console.log( new Date(Date.now()).toLocaleString() , 'removing execution permissions on old binary "__polkadot"',stdout)
                var {stdout} = await execa.command(`curl -L ${assetUrl} -o ${polkaDir}/polkadot`)
                console.log( new Date(Date.now()).toLocaleString() , `downloading new polkadot binary version: ${newCurrent}`,stdout)
                var {stdout} = await execa.command(`chmod +x ${polkaDir}/polkadot`)
                console.log( new Date(Date.now()).toLocaleString() , 'adding execution permission to new polkadot binary',stdout)
            } catch (err){
                console.log( new Date(Date.now()).toLocaleString() , 'Moving binaries, changing permission, downloading new binary',err)
            }

            try {
                var {stdout} = await execa.command(`sudo systemctl daemon-reload`)
                console.log( new Date(Date.now()).toLocaleString() , 'reloading systemctl daemon',stdout)
                var {stdout} = await execa.command(`sudo systemctl restart ${polkaServiceName}`)
                console.log( new Date(Date.now()).toLocaleString() , 'restarting polkadot service via systemctl',stdout)
                var {stdout} = await execa.command(`./polkadot --version`,{cwd: polkaDir})
                var localCurrent = stdout.match(regExVer)
                console.log( new Date(Date.now()).toLocaleString() , `Now running polkadot version: ${localCurrent}`)
            } catch (err) {
                console.log( new Date(Date.now()).toLocaleString(), 'Systemctl functions failed', err)
            }

        } catch (err) {
            console.log( new Date(Date.now()).toLocaleString() , err)
        }
            process.exit()
    } else {
        console.log( new Date(Date.now()).toLocaleString(), 'No new releases')
    }
}

polkaRelCheck()

