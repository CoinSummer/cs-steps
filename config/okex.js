'use strict'

module.exports = (app) => {
    return  {
        homeDir: app.homeDir,
        // url: 'https://exchainrpc.okex.org',
        url: 'http://localhost:26657',
        tokens: {
            "WETH": {
                symbol: 'WETH',
                name: "WETH",
                decimals: 18,
                unit: 'ether',
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                jsonPath: `../projects/ERC20/WETH/build/contracts/WETH9.json`,
            },
            "VAN": {
                symbol: 'VAN',
                name: "VAN",
                decimals: 18,
                unit: 'ether',
                address: "0x63f9d9530B8B9d50743033EB0701B4ef77954AA7",
                jsonPath: `../projects/ERC20/VAN/build/contracts/VanToken.json`,
            },
            "USDT": {
                symbol: 'USDT',
                name: "USDT Token",
                decimals: 18,
                unit: 'ether',
                address: "0x382bB369d343125BfB2117af9c149795C6C65C50",
                jsonPath: `./abis/IERC20.json`,
            },
            "CHE": 
            {
                symbol: 'CHE',
                name: "CHE Token",
                decimals: 18,
                unit: 'ether',
                address: "0x8179d97eb6488860d816e3ecafe694a4153f216c",
                jsonPath: `./abis/IERC20.json`,
            },
            "KST": {
                symbol: 'KST',
                name: "KST Token",
                decimals: 18,
                unit: 'ether',
                address: "0xab0d1578216a545532882e420a8c61ea07b00b12",
                jsonPath: `./abis/IERC20.json`,
            },
        },
        contracts: {
            VAN: {
                name: "VAN Token",
                jsonPath: `./projects/ERC20/VAN/build/contracts/VanToken.json`,
                args: ['0x82deec6f97572b4a1d457778328a45aa72cbf9f2', '1000000000000000000000000000'],
                address: "0x63f9d9530B8B9d50743033EB0701B4ef77954AA7",
                creator: "0x82deec6f97572b4a1d457778328a45aa72cbf9f2"
            },
            MultiAction: {
                name: "MultiAction",
                jsonPath: `./abis/IFOM.json`,
                args: [[]],
                address: "0xaD19E854b76BC971541002174d1CB8E5Bc1cea4a", // 0xFE8a80e4388c0ECd0784d70C06868D19dcA33599
                creator: "0x82deec6f97572b4a1d457778328a45aa72cbf9f2"
            },
            // MultiAction: {
            //     name: "MultiAction",
            //     jsonPath: `./abis/IFOM.json`,
            //     args: [[]],
            //     address: "0xFE8a80e4388c0ECd0784d70C06868D19dcA33599", //
            //     creator: "0x82deec6f97572b4a1d457778328a45aa72cbf9f2"
            // },
            CherrySwap_MasrerChef: {
                name: "MasterChef",
                jsonPath: `/Users/vanzhangxun/workspace/ethereum-toolbox/cs-steps/abis/okex/CherrySwap/MasterChef.json`,
                address: "0x8cddb4cd757048c4380ae6a69db8cd5597442f7b",
            },
            CherrySwap_SwapRouter: {
                name: "SwapRouter",
                jsonPath: `/Users/vanzhangxun/workspace/ethereum-toolbox/cs-steps/abis/okex/CherrySwap/SwapRouter.json`,
                address: "0x865bfde337C8aFBffF144Ff4C29f9404EBb22b15",
            },
        }
    } 
}