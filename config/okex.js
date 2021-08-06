'use strict'

module.exports = (app) => {
    return  {
        homeDir: app.homeDir,
        url: 'https://exchainrpc.okex.org',
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
        },
        contracts: {
            VAN: {
                name: "VAN Token",
                jsonPath: `./projects/ERC20/VAN/build/contracts/VanToken.json`,
                args: ['0x82deec6f97572b4a1d457778328a45aa72cbf9f2', '1000000000000000000000000000'],
                address: "0x63f9d9530B8B9d50743033EB0701B4ef77954AA7",
                creator: "0x82deec6f97572b4a1d457778328a45aa72cbf9f2"
            },
            IFOM: {
                name: "IFOM",
                jsonPath: `./abis/IFOM.json`,
                args: [[]],
                address: "0xaD19E854b76BC971541002174d1CB8E5Bc1cea4a", // 0xFE8a80e4388c0ECd0784d70C06868D19dcA33599
                creator: "0x82deec6f97572b4a1d457778328a45aa72cbf9f2"
            },
            // https://www.oklink.com/okexchain/address/0x865bfde337C8aFBffF144Ff4C29f9404EBb22b15
        }
    } 
}