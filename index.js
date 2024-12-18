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
      nativeCurrency = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
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

app.get("/tokenBalances", async (req, res) => {
  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

  try {
    const { chain, address } = req.query;

    // Step 1: Get wallet token balances
    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
      chain: chain,
      address: address,
    });

    // Extract JSON-safe token data
    let tokens = response.toJSON();
    console.log("Tokens:", tokens);

    let legitTokens = [];

    // Step 2: Fetch prices and filter legit tokens
    for (let i = 0; i < tokens.length; i++) {
      try {
        const priceResponse = await Moralis.EvmApi.token.getTokenPrice({
          address: tokens[i].token_address,
          chain: chain,
        });

        // Extract JSON-safe price data
        const priceData = priceResponse.toJSON();
        console.log(`Token ${i} Price:`, priceData);

        if (priceData.usdPrice > 0.01) {
          tokens[i].usd = priceData.usdPrice; // Add price to token object
          legitTokens.push(tokens[i]);
        } else {
          console.log("Token price too low: 0.01 or less");
        }
      } catch (priceError) {
        console.error(
          `Error fetching price for token ${i}:`,
          priceError.message
        );
      }
    }

    // Step 3: Send filtered tokens as the response
    console.log("Legit Tokens:", legitTokens);
    res.json(legitTokens); // Use `res.json` for JSON-safe output
  } catch (error) {
    console.error("Error:", error.message);

    // Send a sanitized error response
    res.status(500).json({ error: error.message });
  }
});
