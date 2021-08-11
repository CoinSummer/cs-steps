const redis = require("redis");
const configloader = require('./config')
const loggerLoader = require('./config/logger')

const { Util, Gwei, ContractWrapper } = require('./app/util.js')
const { ContractApp } = require('./app/index')

const BN = require('bignumber.js')
const { toWei, numberToHex, leftPad } = require('web3-utils')

// ==================================================================================== |
// PASSWORD='CsOkEX!23$' ENV=okex SUBMIT=N node liquidity_actions
// --------------------- Config Params ------------------------------------------------ +

const MyAddress            = '0x82deec6f97572b4a1d457778328a45aa72cbf9f2'
const SwapRouter           = 'CherrySwap_SwapRouter' 
const MasterChef           = 'CherrySwap_MasrerChef'
const TokenA               = 'CHE'
const TokenB               = 'USDT' 

const LP_TokenAddr     = '0x089dedbfd12f2ad990c55a2f1061b8ad986bff88'

const GasPriceGwei = 0.1

// ------------------------------------------------------------------------------------ |
const gasPrice = GasPriceGwei * Gwei

class BaseApp extends ContractApp {
    constructor(util, config, contractName, gasPrice) {
        super(util, config)
        console.log(contractName)

        this.owner = config.contracts[contractName].creator
        this.address = config.contracts[contractName].address
        this.gasPrice = gasPrice

        const JsonData = require(config.contracts[contractName].jsonPath)
        const contractWrapper = new ContractWrapper(util.eth, JsonData.abi, config.contracts[contractName].address)
        this.setContractWrapper(contractWrapper)

        this.apps = {}
        this.tokens = {}
    }

    async transferOwnership(owner) {
        await this.methodSend('transferOwnership', [owner], this.owner, { gasPrice: this.gasPrice, gas: 3000000 })
    }

    async openWorkerMode() {
        await this.methodSend(
            'resetWorkerModeEnable', 
            [true], 
            this.owner,
            { gasPrice: this.gasPrice, gas: 60000 })
    }
    
    async addWorkers(workers) {
        await this.methodSend('addWorkers', [workers], this.owner, { gasPrice: this.gasPrice, gas: 300000 * workers.length })
    }

    async printWorkers(workers) {
        for(const worker of workers) {
            const result = await this.methodCall('isWorker', [worker])
            console.log(worker, 'is_worker ?', result)
        }
    }

    async deposit(from, amount) {
        await this.methodSend(
            'deposit', 
            ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', toWei(String(amount), 'ether')],
            from,
            { value: toWei(String(amount), 'ether'), gasPrice: this.gasPrice, gas: 100000 })
    }

    async withdraw(amount, to) {
        await this.methodSend(
            'withdraw', 
            [toWei(String(amount), 'ether'), to],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 100000 })
    }
    
    async erc20Transfer(token, amount, to) {
        await this.methodSend(
            'transfer', 
            [token, toWei(String(amount), 'ether'), to],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 100000 })
    }

    async approve(token, spender, amount) {
        await this.methodSend(
            'approve', 
            [token, spender, toWei(String(amount), 'ether')],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 200000 })
    }

    async ethTtransfer(from, to, amount) {
        await this.transfer(from, to, toWei(String(amount), 'Ether'), { gasPrice: this.gasPrice, gas: 100000 })
    }
}


class Bee extends BaseApp {
  
    async xLog() {
        await this.methodSend(
            'xLog', 
            [Date.now()], 
            this.owner, 
            { value: 0, gasPrice, gas: 3000000 })
    }

    loadContractFromConfig(contractName, key) {
        const app = new ContractApp(this.util, this.config)

        const appConf = this.config.contracts[contractName]
        const AbiJsonData = require(appConf.jsonPath)
        const contractWrapper = new ContractWrapper(this.util.eth, AbiJsonData.abi, appConf.address)
        app.setContractWrapper(contractWrapper)
        app.setAddress(appConf.address)
        this.apps[key] = app
    }

    loadTokenFromConfig(tokenName) {
        const app = new ContractApp(this.util, this.config)

        const tokenConf = this.config.tokens[tokenName]
        const AbiJsonData = require(tokenConf.jsonPath)
        const contractWrapper = new ContractWrapper(this.util.eth, AbiJsonData.abi, tokenConf.address)
        app.setContractWrapper(contractWrapper)
        app.setAddress(tokenConf.address)
        this.tokens[tokenName] = app
    }

    loadToken(address) {
        const app = new ContractApp(this.util, this.config)
        const JsonData = require(`./abis/IERC20.json`)
        const contractWrapper = new ContractWrapper(this.util.eth, JsonData.abi, address)
        app.setContractWrapper(contractWrapper)
        app.setAddress(address)
        this.tokens[String(address).toLocaleLowerCase()] = app
    }

    // 提前步骤
    // = 合约 approve X Token to swapPool
    // = 合约 approve USDT to swapPool

    // = 1 stake 
    // = 1.1 AddLiquidity to swapPool
    // = 1.2 approve LP Token to LiquidityPool
    // = 1.3 deposit(amount)

    // = 2 withdraw and sell
    // = 2.1 withdraw LP Token and reward from LiquidityPool 
    // = 2.2 remove Liquidity from swapPool
    // = 2.4 swap X token to USDT

    // = 1 stake 
    // 0xe2bbb1580000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000054377455623f8a6
    async methodEncode(appKey, name, parmas) {
        const app = this.apps[appKey]

        return await app.funcEncode(name,  [...parmas])    
    }

    // async methodEncode(targetAddress, name, parmas) {
    //     const addr = String(targetAddress).toLocaleLowerCase()
    //     const app = this.apps[addr]

    //     return await app.funcEncode(name,  [...parmas])    
    // }

    async methodEncodeToken(targetAddress, name, parmas) {
        const addr = String(targetAddress).toLocaleLowerCase()
        const app = this.tokens[addr]

        return await app.funcEncode(name,  [...parmas])    
    }

    async approve(tokenAddress, spender, amount='0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') {
        return await this.methodSend(
            'approve', 
            [tokenAddress, spender, amount],
            this.owner, 
            { value: 0, gasPrice, gas: 3000000 }) 
    }

    async deposit(lpTokenAddress, pid) {
        const tokenLP = this.tokens[lpTokenAddress]
        const balance =  await tokenLP.methodCall('balanceOf', [this.address])
        console.log(balance)
        const depositRaw = await this.methodEncode('MasterChef', 'deposit', [pid, balance])
        console.log(depositRaw)
        const steps = [
            [this.apps['MasterChef'].address, depositRaw, 0],  // deposit
        ]

        return await this.methodSend(
            'xProxySteps', 
            [steps],
            this.owner, 
            { value: 0, gasPrice, gas: 3000000 }) 
    }

    async havest(lpTokenAddress, pid) {
        const tokenLP = this.tokens[lpTokenAddress]
        const appMasterChef = this.apps['MasterChef']
        
        const userInfo = await appMasterChef.methodCall('userInfo', [pid, this.address])
        console.log(userInfo)
        const amount = userInfo.amount
        // rewardDebt: '1360865814891197234',
        // accKstAmount: '975901324112876'

        const withdrawRaw = await this.methodEncode('MasterChef', 'withdraw', [pid, amount])
        // console.log(withdrawRaw)

        // const trfRaw = await this.funcEncode('transferERC20From',  [lpTokenAddress, MyAddress, this.address, amount])    

        // const balance =  await tokenLP.methodCall('balanceOf', [this.address])
        const removeLiquidityRaw = await this.funcEncode('xRemoveLiquidity', [
            this.apps['SwapRouter'].address, 
            this.tokens[TokenA].address, 
            this.tokens[TokenB].address, 
            amount, 
            // toWei('10', 'ether'),
            0, 
            0, 
            lpTokenAddress
        ])

        const swapRaw = await this.funcEncode('xSwapExactTokensForTokens', 
            [
                this.apps['SwapRouter'].address, 
                [this.tokens[TokenA].address, this.tokens[TokenB].address], 
                0, 
                0, 
                this.address, 
                parseInt(Date.now()/1000 + 60)
            ])
       
        const steps = [
            [this.apps['MasterChef'].address, withdrawRaw, 0],  // 
            // [this.address, trfRaw, 0],
            [this.address, removeLiquidityRaw, 0],  // removeLiquidity
            [this.address, swapRaw, 0],
        ]

        return await this.methodSend(
            'xProxySteps', 
            [steps],
            this.owner, 
            { value: 0, gasPrice, gas: 30000000 }) 
    }

    async xProxySteps(poolAddress) {
        const steps = [
            [poolAddress, '0x3d18b912', 0],  //  getReward
            [poolAddress, '0xe9fad8ee', 0],  //  exit
        ]

        return await this.methodSend(
            'xProxySteps', 
            [steps],
            this.owner, 
            { value: 0, gasPrice, gas: 8000000 }) 
    }

    async transferERC20From() {
        await this.methodSend(
            'transferERC20From', 
            ['0x84ee6a98990010fe87d2c79822763fca584418e9', MyAddress, this.address, toWei('59.2775833973907', 'ether')],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 8000000 })
    }

    async erc20Transfer(token, amount, to) {
        await this.methodSend(
            'transferERC20', 
            [token, amount, to],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 1000000 })
    }

    async xRemoveLiquidity(routerAddress, lpTokenAddress) {
        await this.methodSend(
            'xRemoveLiquidity', 
            [routerAddress, '0xab0d1578216a545532882e420a8c61ea07b00b12', '0x382bB369d343125BfB2117af9c149795C6C65C50', toWei('59.2775833973907', 'ether'), 0, 0, lpTokenAddress],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 30000000 })
    }

    async xSwapExactTokensForTokens(routerAddress) {
        await this.methodSend(
            'xSwapExactTokensForTokens', 
            [routerAddress, ['0xab0d1578216a545532882e420a8c61ea07b00b12', '0x382bB369d343125BfB2117af9c149795C6C65C50'], 0, 0, this.address, parseInt(Date.now()/1000 + 60)],
            this.owner,
            { value: 0, gasPrice: this.gasPrice, gas: 30000000 })
    }

    async approveLpToken(lpTokenAddress) {
        const tokenLP = this.tokens[lpTokenAddress]
       
        await tokenLP.methodSend('approve', [this.address, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'], this.owner, { value: 0, gasPrice, gas: 3000000 })
    }

    async msgHandle(message) {
        const msgData = JSON.parse(message)
        try {
            console.log("===>", msgData.symbol, msgData.function, msgData.gasPrice)
            if (msgData.function === 'removeLiquidity' && parseInt(msgData.pid) === 2) {
                await this.havest(LP_TokenAddr, 2)
            }
        } catch (e) {
            console.log(e)
        }
        
        
    }

    async subscribe(channel) {
        const that = this
        const subscriber = redis.createClient({
            host: 'localhost',
            port: 6379,
            db: 0,
        });

        subscriber.on("subscribe", function(channel, count) {
            console.log('subscribe')
        });

        subscriber.on("message", async function(channel, message) {
            console.log("Subscriber received message in channel '" + channel + "': " + message);
            // await app.step2(OKEX_lpTokenAddr, OKEX_LiquidityPool, 6, OKEX_kswapRouterAddr, OKEX_TokenKstAddr, OKEX_TokenUSDTAddr)
            await that.msgHandle(message)
        });

        subscriber.subscribe(channel);
    }
}

async function run() {
    try {
        const env = process.env.ENV
        const config = configloader({ mode: env, homeDir: __dirname })
        loggerLoader({ mode: env, homeDir: __dirname })

        const util = new Util(config.url)
        const app = new Bee(util, config, 'MultiAction', gasPrice)

        app.loadContractFromConfig(SwapRouter, 'SwapRouter')
        app.loadContractFromConfig(MasterChef, 'MasterChef')

        app.loadTokenFromConfig(TokenA)
        app.loadTokenFromConfig(TokenB)

        app.loadToken(LP_TokenAddr)
        await app.subscribe('pending')
        // await app.approve(app.tokens[TokenA].address, app.apps['SwapRouter'].address)
        // await app.approve(app.tokens[TokenB].address, app.apps['SwapRouter'].address)
        // await app.approve(LP_TokenAddr, app.apps['SwapRouter'].address)
        // await app.approve(LP_TokenAddr, app.apps['MasterChef'].address)

        // await app.deposit(LP_TokenAddr, 2)

        // await app.havest(LP_TokenAddr, 2)

        // await app.xSwapExactTokensForTokens(OKEX_kswapRouterAddr)

        // await app.erc20Transfer(config.tokens['USDT'].address, toWei('30', 'ether'), '0x82deec6f97572b4a1d457778328a45aa72cbf9f2') 

        // await app.approveLpToken(OKEX_lpTokenAddr)
        // await app.xRemoveLiquidity(OKEX_kswapRouterAddr, OKEX_lpTokenAddr)
        
        // await app.transferOwnership('0x91F402f532498b52069d73C4fA672DD97f8d1b80')
        // await app.addWorkers(['0x82deec6f97572b4a1d457778328a45aa72cbf9f2'])
    } catch (e) {
        console.error("deploy contract fail:", e)
    }
}

run()
