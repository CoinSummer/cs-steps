const redis = require("redis");
const configloader = require('./config')
const loggerLoader = require('./config/logger')

const { Util, Gwei, ContractWrapper } = require('./app/util.js')
const { ContractApp } = require('./app/index')

const BN = require('bignumber.js')
const { toWei, numberToHex, leftPad } = require('web3-utils')

// ==================================================================================== |
// PASSWORD='CsOkEX!23$' ENV=okex SUBMIT=N node main
// --------------------- Config Params ------------------------------------------------ +

const MyAddress            = '0x82deec6f97572b4a1d457778328a45aa72cbf9f2'
const OKEX_kswapRouterAddr = '0xc3364A27f56b95f4bEB0742a7325D67a04D80942' 
const OKEX_LiquidityPool   = '0xaEBa5C691aF30b7108D9C277d6BB47347387Dc13'
const OKEX_lpTokenAddr     = '0x84ee6a98990010fe87d2c79822763fca584418e9'
const OKEX_TokenUSDTAddr   = '0x382bB369d343125BfB2117af9c149795C6C65C50'
const OKEX_TokenKstAddr    = '0xab0d1578216a545532882e420a8c61ea07b00b12' 
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

    loadContract(contractName, address) {
        const app = new ContractApp(this.util, this.config)
        const JsonData = require(`./abis/steps/${contractName}.json`)
        const contractWrapper = new ContractWrapper(this.util.eth, JsonData.abi, address)
        app.setContractWrapper(contractWrapper)
        app.setAddress(address)
        this.apps[String(address).toLocaleLowerCase()] = app
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
    async methodEncode(targetAddress, name, parmas) {
        const addr = String(targetAddress).toLocaleLowerCase()
        const app = this.apps[addr]

        return await app.funcEncode(name,  [...parmas])    
    }
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

    async deposit(lpTokenAddress, lPoolAddress, pid) {
        const tokenLP = this.tokens[lpTokenAddress]
        const balance =  await tokenLP.methodCall('balanceOf', [this.address])
        console.log(balance)
        const depositRaw = await this.methodEncode(lPoolAddress, 'deposit', [pid, balance])
        console.log(depositRaw)
        const steps = [
            [lPoolAddress, depositRaw, 0],  // deposit
        ]

        return await this.methodSend(
            'xProxySteps', 
            [steps],
            this.owner, 
            { value: 0, gasPrice, gas: 3000000 }) 
    }

    async step2(lpTokenAddress, lPoolAddress, pid, routerAddress, tokenAAddr, tokenBAddr) {
        const tokenLP = this.tokens[lpTokenAddress]
        const app = this.apps[String(lPoolAddress).toLocaleLowerCase()]
        
        const userInfo = await app.methodCall('userInfo', [pid, MyAddress])
        console.log(userInfo)
        const amount = userInfo.amount
        // rewardDebt: '1360865814891197234',
        // accKstAmount: '975901324112876'

        // const withdrawRaw = await this.methodEncode(lPoolAddress, 'emergencyWithdraw', [pid])
        const withdrawRaw = await this.methodEncode(lPoolAddress, 'withdraw', [pid, amount])
        // console.log(withdrawRaw)

        const trfRaw = await this.funcEncode('transferERC20From',  [lpTokenAddress, MyAddress, this.address, amount])    

        // const balance =  await tokenLP.methodCall('balanceOf', [this.address])
        // const removeLiquidityRaw = await this.funcEncode(routerAddress, 'removeLiquidity', [tokenBAddr, tokenAAddr, balance, 0, 0, this.address, parseInt(Date.now()/1000 + 60)])
        const removeLiquidityRaw = await this.funcEncode('xRemoveLiquidity', [routerAddress, tokenAAddr, tokenBAddr, amount, 0, 0, lpTokenAddress])

        const swapRaw = await this.funcEncode('xSwapExactTokensForTokens', 
            [routerAddress, ['0xab0d1578216a545532882e420a8c61ea07b00b12', '0x382bB369d343125BfB2117af9c149795C6C65C50'], 0, 0, this.address, parseInt(Date.now()/1000 + 60)])
       
        const steps = [
            [lPoolAddress, withdrawRaw, 0],  // 
            [this.address, trfRaw, 0],
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
        
        console.log("===>", msgData.symbol, msgData.function, msgData.gasPrice)
    }

    async subscribe(channel) {
        const that = this
        const subscriber = redis.createClient({
            host: 'localhost',
            port: 6378,
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

        const app = new Bee(util, config, 'IFOM', gasPrice)

        app.loadContract('OKEX_LiquidityPool', OKEX_LiquidityPool)
        app.loadContract('OKEX_KswapRouter',   OKEX_kswapRouterAddr)
        app.loadToken(OKEX_lpTokenAddr)
        await app.subscribe('pending')
        // await app.approve(OKEX_lpTokenAddr, OKEX_LiquidityPool)
        // await app.approve(OKEX_lpTokenAddr, OKEX_kswapRouterAddr)
        // await app.approve('0xab0d1578216a545532882e420a8c61ea07b00b12', OKEX_kswapRouterAddr)

        // await app.deposit('0x84ee6a98990010fe87d2c79822763fca584418e9', '0xaEBa5C691aF30b7108D9C277d6BB47347387Dc13', 1)

        // await app.step2(OKEX_lpTokenAddr, OKEX_LiquidityPool, 6, OKEX_kswapRouterAddr, OKEX_TokenKstAddr, OKEX_TokenUSDTAddr)

        // await app.erc20Transfer('0xab0d1578216a545532882e420a8c61ea07b00b12', '975901324112876', '0xaD19E854b76BC971541002174d1CB8E5Bc1cea4a') 
        // await app.xSwapExactTokensForTokens(OKEX_kswapRouterAddr)

        // await app.approveLpToken(OKEX_lpTokenAddr)
        // await app.xRemoveLiquidity(OKEX_kswapRouterAddr, OKEX_lpTokenAddr)
        
        // await app.transferERC20From()
        // await app.addWorkers([app.address])
    } catch (e) {
        console.error("deploy contract fail:", e)
    }
}

run()
