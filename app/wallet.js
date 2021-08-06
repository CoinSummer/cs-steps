'use strict'

const fs = require('fs')

const bip39 = require('bip39');
// const bip32 = require('bip32');
const { hdkey } = require('ethereumjs-wallet')
const util = require('ethereumjs-util')

const Accounts = require('web3-eth-accounts');


class Wallet {
    constructor(homeDir, pwd) {
        this.accountFactory = new Accounts();
        this.homeDir = homeDir;
        this.password = pwd
        this.accounts = []
        this.addrs = []
        this.walletPath = `${this.homeDir}/keystore/wallet`

        this.saver = null
    }

    createFromMnemonic(mnemonic, password, index=0, env) {
        const seed = bip39.mnemonicToSeedSync(mnemonic, password) 
        const hdWallet = hdkey.fromMasterSeed(seed)
        const keypair = hdWallet.derivePath(`m/44'/60'/0'/0/${parseInt(index)}`)
        
        const encrypted = this.accountFactory.encrypt(util.bufferToHex(keypair._hdkey._privateKey), this.password)
        this.writeKeystoreJson(encrypted, env)

        this.accounts.push(encrypted)
        this.addrs.push(this.toHexAddr(encrypted.address))

        return encrypted.address
    }


    createFromMnemonicX(mnemonic, password, index=0, env) {
        const seed = bip39.mnemonicToSeedSync(mnemonic, password) 
        const hdWallet = hdkey.fromMasterSeed(seed)
        const keypair = hdWallet.derivePath(`m/44'/60'/0'/0/${parseInt(index)}`)
        
        const encrypted = this.accountFactory.encrypt(util.bufferToHex(keypair._hdkey._privateKey), this.password)
    
        return encrypted.address
    }

    setSaver(saver) {
        this.saver = saver
    }

    toHexAddr(addr) {
        return addr.startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`
    }

    getAccount(addr) {
        addr = addr.startsWith('0x') ? addr.substr(2).toLowerCase() : addr.toLowerCase()

        const Account = this.accounts.find(item => {
            return item.address.toLowerCase() === addr
        })
    
        if (!Account) {
            throw new Error(`Account ${addr} not in wellat`)
        }

        const aco = this.accountFactory.decrypt(Account, this.password)
        return aco
    }

    size() {
        return this.accounts.length
    }

    all() {
        return [...this.addrs]
    }

    getAddressPage(from, count) {
        const that = this
        if (this.accounts.length < from + count) {
            throw new Error('count overflow accounts length')
        }
        return this.accounts.slice(from, from + count).map(item => {
            return that.toHexAddr(item.address)
        })
    }
    
    create(num) {
        const len = num || 1
        const addrs = []
        const ach = new Accounts()
        for(let i=0; i<len; i++) {
            let a = this.accountFactory.create()
            
            const encrypted = this.accountFactory.encrypt(a.privateKey, this.password)
            this.save(encrypted)
            if (this.saver) this.saver.save(encrypted.address, JSON.stringify(encrypted))

            this.accounts.push(encrypted)
            this.addrs.push(this.toHexAddr(encrypted.address))
            addrs.push(this.toHexAddr(encrypted.address))
            
            a = null
        }
        return addrs
    }

    writeKeystoreJson(encrypted, env) {
        const raw = JSON.stringify(encrypted)
        fs.writeFileSync(`${this.homeDir}/keystore/${env}/0x${String(encrypted.address).toLowerCase()}`, raw, {flag: 'w'}, (err) => {
            if (err){ 
                console.error("Write wellat error:", err)
                throw err
            };
        });
    }

    writePrivateKeyToKeystore(privateKey, password) {
        const encrypted = this.accountFactory.encrypt(privateKey, password)
        const raw = JSON.stringify(encrypted)
        fs.writeFileSync(`${this.homeDir}/keystore/0x${encrypted.address}`, raw, {flag: 'w'}, (err) => {
            if (err){ 
                console.error("Write wellat error:", err)
                throw err
            };
        });

        return encrypted.address
    }

    save(data) {
        const raw = JSON.stringify(data) + '\n'
        fs.writeFileSync(this.walletPath, raw, {flag: 'a'}, (err) => {
            if (err){ 
                console.error("Write wellat error:", err)
                throw err
            };
        });
    }

    load() {
        // const start = Date.now()
        const raw = fs.readFileSync(this.walletPath, 'utf8')
        const lines = raw.split("\n")
        for(const line of lines) {
            if (line.length < 10) {
                continue
            }
            try {
                const jsonLine = JSON.parse(line)
                //const Account = this.accountFactory.decrypt(jsonLine, this.password)
                this.accounts.push(jsonLine)
                this.addrs.push(this.toHexAddr(jsonLine.address))
            } catch (e) {
                console.error(`error load wellet ${e.message}`)
            }
            
        }
        // const end = Date.now()
        // const useTime = end - start
        // console.log(`===Load wellat finish, ${this.accounts.length} accounts use time ${useTime}ms `)
    }

    print() {
        console.log(this.addrs.map(item => {
            return { address: item, name: 'auto', enable: true }
        }))
    }

    writeAccountsJson(env) {
        if (!env) { throw new Error('env not defined') }
        const arr = this.addrs.map(item => {
            return { address: item, name: 'auto', enable: true }
        })
        const raw = JSON.stringify(arr)

        fs.writeFileSync(`${this.homeDir}/keystore/accounts.json`, raw, {flag: 'a'}, (err) => {
            if (err){ 
                console.error("Write wellat error:", err)
                throw err
            };
        });
    }

}

module.exports = { Wallet }