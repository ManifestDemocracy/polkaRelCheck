const EventEmitter = require('events');
class StreamEmitter extends EventEmitter {}
const hashEmitter = new StreamEmitter();
const fs = require('fs')
const dayjs = require('dayjs')
var relativeTime = require('dayjs/plugin/relativeTime')
dayjs.extend(relativeTime)
const axios = require('axios')
const execa = require('execa');
const semverSort = require('semver/functions/sort')
const semverGt = require('semver/functions/gt')
var crypto = require('crypto');
const { clearInterval } = require('timers');
var config = JSON.parse(fs.readFileSync(`${__dirname}/.config`,'utf-8'))
var parityGPG = '9D4B 2B6E B8F9 7156 D196  69A9 FF08 12D4 91B9 6798'
var regExVer = new RegExp(/(\d{1,2}\.\d{1,2}\.\d{1,2})(\-\d{1,2})?/gm)
var newCurrent

async function logOut(msg, no){
    if(no){
        console.log(msg)
    } else {
        console.log(new Date(Date.now()).toLocaleString(),msg)
    }
}

async function shaCheck(polkaDir){
    logOut(`Verifying SHA256 hash`)
    var publishedSHA256 = fs.readFileSync(`${polkaDir}/polkadot.sha256`,'utf-8')
    publishedSHA256 = publishedSHA256.split(' ')[0]
    var binaryHashSum = crypto.createHash('sha256')
    var newBinary = polkaDir + "/polkadot.new"
    var fileStream = fs.ReadStream(newBinary,null)
    fileStream.on('data', async (data) => {
        binaryHashSum.update(data)
    })
    fileStream.on('end', async () => {
        var hash = binaryHashSum.digest('hex')

        if(publishedSHA256 == hash){
            logOut(`SHA256 File:           ${hash}\nSHA256 Calculated:     ${publishedSHA256}\nMatch: ${hash == publishedSHA256}\n`,true)
            hashEmitter.emit('SHA', true);
        } else {
            logOut(`[WARNING] | SHA-256 Hash of binary does not match the one retrieved with new binary | [WARNING]`)
            hashEmitter.emit('SHA', false);
        }
    })
}

async function gpgCheck(polkaDir){
    var msg =''
    var {stdout} = await execa.command('gpg --help', stdout)
    var version = stdout.split('\n')[0]
    if (version) {
        logOut(`Running GPG Checks: ${version}`)
        var res = await execa.command(`gpg --verify ${polkaDir}/polkadot.asc ${polkaDir}/polkadot.new`).then(async (result) => {
            var temp = result.stderr.replace(/(?:gpg: )/gm,'')
            temp = temp.split('\n')
            var date = temp[0].split('made')
            date = new Date(date)
            var rel = dayjs(date).fromNow()
            var signer = temp[2].match(/(?<=\<)(.*?)(?=\>)/).shift()
            var fp = temp[5].split(': ')[1]
            msg = `Signed by: ${signer} | ${rel} | ${date.toISOString()}\nFingerprint from signature:  ${fp}\nFingerprint on file:         ${parityGPG}\nMatch: ${fp == parityGPG}\n`
            if(fp != parityGPG){
                msg = '[WARNING] | Signature fingerprint does not match fingerprint on file | [WARNING]\n' + msg
                logOut(msg,true)
                return false
            } else if(signer !='security@parity.io'){
                msg = '[WARNING] | Signer of this binary is not security@parity.io | [WARNING]\n' + msg
                logOut(msg,true)
                return false
            } else {
                logOut(msg, true)
                return true
            }
        });
        hashEmitter.emit('GPG', res)
    } else {
        logOut('Please install gpg if you want to validate GPG signatures')
        return false
    }
}

async function semCheck(loc_v, relList) {
    var relList_ = []
    do {
        var new_c = relList.pop()
        if(semverGt(new_c, loc_v)){
            newCurrent = new_c
            logOut(`\n-------\nNew version Released ${new_c} (local: ${loc_v})\n-------`)
            return true
        } else if (loc_v != new_c) {
            relList_.push(new_c)
        }
    } while (relList.length > 0)
    do {
        var new_c = relList_.shift()
        if(new_c != loc_v){
            var newAr = new_c.split('-');var locAr = loc_v.split('-');
            if(newAr[1]&& locAr[1]){
                if(parseInt(newAr[1]) > parseInt(locAr[1])){
                    newCurrent = new_c
                    logOut('New Patch Release',new_c, loc_v)
                    return true
                } 
            } else if (newAr[1] && newAr[0] == locAr[0]) {
                newCurrent = new_c
                logOut('New Patch Release',new_c, loc_v)
                return true
            }
        }
    } while (relList_.length > 0)
    return false
}

async function polkaRelCheck(){

    polkaDir = process.argv[2]
    polkaServiceName = process.argv[3]
    try {
        if (fs.existsSync(`${polkaDir}/polkadot`)){
            var {stdout} = await execa.command(`./polkadot --version`,{cwd: polkaDir})
            var localCurrent = `v${stdout.match(regExVer)}`
            logOut(`Local current version of polkadot is: ${localCurrent}`)
        } else {
            logOut(`No polkadot file exists in ${polkaDir}`)
            process.exit(1)
        }
    } catch (err){
        logOut(`Get local polkadot version failed: ${err}`)
        process.exit(2)
    }
    const axOpts = {
        method: 'get',
        url: 'https://api.github.com/repos/paritytech/polkadot/releases'
      };
    var polkaRels = await axios(axOpts).then(async (response) => {
        return response.data
    }).catch(err => logOut('releases:  '+ err))
    try {
        var relTags = polkaRels.map(x => x.tag_name)
    } catch(err){
        logOut(err)
    }
    if(await semCheck(localCurrent, semverSort(relTags))){
        logOut(`.config ignoreSecurity is set to: ${config.ignoreSecurity}`)
        var errMessage =  'Failed moving binaries, changing permission, downloading new binary'
        var newRelease = polkaRels.filter(x=>x.tag_name == newCurrent)
        newRelease = newRelease[0]
        var assetUrl = newRelease.assets.filter(x=>x.name == 'polkadot')
        assetUrl = assetUrl[0].browser_download_url
        logOut(`Download URL for the new binary ${assetUrl}`)
        try {
            if (await fs.existsSync(`${polkaDir}/__polkadot`)) {
                var {stdout} = await execa.command(`rm --force ${polkaDir}/polkadot.old`)
                logOut('deleting old backup polkadot binary')
            }
            var {stdout} = await execa.command(`rm --force ${polkaDir}/polkadot.sha256 && rm --force ${polkaDir}/polkadot.asc`)
            logOut('Removing old gpg and hash files')
            logOut(`Downloading new polkadot binary version: ${newCurrent} with SHA-256 Hash and PGP Signature`)
            await execa.command(`curl -L ${assetUrl} -o ${polkaDir}/polkadot.new`)
            await execa.command(`curl -L ${assetUrl}.asc -o ${polkaDir}/polkadot.asc`)
            await execa.command(`curl -L ${assetUrl}.sha256 -o ${polkaDir}/polkadot.sha256`)
            logOut(`Running security checks on polkadot binary version: ${newCurrent}\n`)
            if (config.ignoreSecurity == "skip") {
                shaCheck_res = false
                gpgCheck_res = false
            } else {
                shaCheck(polkaDir)
                gpgCheck(polkaDir)
            }
        } catch (err){
            logOut(`${errMessage}`,err)
        }
    } else {
        logOut('No new releases')
        process.exit()
    }
}


async function completeUpgrade(polkaDir, gpgCheck_res, shaCheck_res){
    if((gpgCheck_res && shaCheck_res) || config.ignoreSecurity){
        logOut('###-###-###\nPassed security checks\n###-###-###\n',true)
        var {stdout} = await execa.command(`mv ${polkaDir}/polkadot ${polkaDir}/polkadot.old`)
        logOut(`Renaming current polkadot binary to "polkadot.old"`)
        
        var {stdout} = await execa.command(`chmod -x ${polkaDir}/polkadot.old`)
        logOut(`Removing execution permissions on old binary "polkadot.old"`)
        
        var {stdout} = await execa.command(`mv ${polkaDir}/polkadot.new ${polkaDir}/polkadot`)
        logOut(`Renaming new polkadot binary from polkadot.new to "polkadot"`)
        
        var {stdout} = await execa.command(`chmod +x ${polkaDir}/polkadot`)
        logOut('Adding execution permission to new polkadot binary')
        
        errMessage = 'Systemctl functions failed'
        var {stdout} = await execa.command(`sudo systemctl daemon-reload`)
        logOut('Reloading systemctl daemon')
        
        var {stdout} = await execa.command(`sudo systemctl restart ${polkaServiceName}`)
        logOut('Restarting polkadot service via systemctl')
        
        var {stdout} = await execa.command(`./polkadot --version`,{cwd: polkaDir})
        var localCurrent = stdout.match(regExVer)
        logOut(`Upgrade started: ${dayjs(startTime).fromNow()}`)
        logOut(`Now running polkadot version: ${localCurrent}`)
    } else {
        logOut('###-###-###\nFailed security checks\n###-###-###\n',true)
        logOut('\nSecurity checks failed, please review manually\n**Or if you set {ignoreSecurity: true} in the .config file, remember to manually verify the file or fix the dependencies [UNSAFE]**')
    }
    process.exit()
}

var startTime = Date.now()
var polkaServiceName
var polkaDir
var gpgCheck_res
var shaCheck_res

hashEmitter.on('SHA', (match) => {
    shaCheck_res = match
});

hashEmitter.on('GPG', (match) => {
    gpgCheck_res = match
});

var streamWait = setInterval(() => {
    if(gpgCheck_res != null && shaCheck_res != null) {
        clearInterval(streamWait)
        completeUpgrade(polkaDir,gpgCheck_res,shaCheck_res)
    }
}, 5000);


polkaRelCheck()

