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

app.get("/tokenTransfers", async (req, res) => {
  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

  try {
    const { chain, address } = req.query;

    // Step 1: Get wallet token transfers
    const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
      chain: chain,
      address: address,
    });

    // Log and validate response
    console.log("Raw Response:", response.toJSON());
    const userTrans = response.toJSON()?.result || []; // Fallback to an empty array
    console.log("User Transfers:", userTrans);

    if (userTrans.length === 0) {
      console.log("No token transfers found for the wallet.");
      return res.status(200).json({ message: "No token transfers found." });
    }

    let userTransDetails = [];

    // Step 2: Fetch token metadata
    for (let i = 0; i < userTrans.length; i++) {
      try {
        const metaResponse = await Moralis.EvmApi.token.getTokenMetadata({
          address: [userTrans[i].address],
          chain: chain,
        });

        // Log and validate metadata response
        const metaData = metaResponse.toJSON()?.result || [];
        console.log(`Metadata for token ${i}:`, metaData);

        if (metaData.length > 0) {
          userTrans[i].decimals = metaData[0].decimals;
          userTrans[i].symbol = metaData[0].symbol;
          userTransDetails.push(userTrans[i]);
        } else {
          console.log(`No metadata found for token ${i}`);
        }
      } catch (metaError) {
        console.error(
          `Error fetching metadata for token ${i}:`,
          metaError.message
        );
      }
    }

    // Step 3: Send transfer details as the response
    console.log("User Transfer Details:", userTransDetails);
    res.status(200).json(userTransDetails);
  } catch (error) {
    console.error("Error fetching token transfers:", error.message);

    // Send detailed error response
    res.status(500).json({
      error: "Failed to fetch token transfers.",
      details: error.message,
    });
  }
});
