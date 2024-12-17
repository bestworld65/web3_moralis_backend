const Moralis = require("moralis").default;
const express = require("express");
const app = express();
const cors = require("cors");
const port = 8080;
require("dotenv").config();

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get("/nativeBalance", async (req, res) => {
  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

  try {
    const { chain, address } = req.query;

    const response = await Moralis.EvmApi.balance.getNativeBalance({
      chain: chain,
      address: address,
    });

    const nativeBalance = response.result;

    let nativeCurrency;

    if (chain === "0x1") {
      nativeCurrency = "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0";
    }

    const nativePrice = await Moralis.EvmApi.token.getTokenPrice({
      chain: chain,
      address: nativeCurrency, //WETH Contract
    });

    nativeBalance.usd = nativePrice.result.usdPrice;
    // console.log("qqqq", chain, address, nativeBalance);

    res.send(nativeBalance);
  } catch (error) {
    res.send(error);
  }
});
