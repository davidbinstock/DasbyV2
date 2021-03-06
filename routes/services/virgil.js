const JwtGenerator = require('virgil-sdk').JwtGenerator;
const CardManager= require('virgil-sdk').CardManager;
const VirgilCardVerifier = require('virgil-sdk').VirgilCardVerifier;
const GeneratorJwtProvider = require('virgil-sdk').GeneratorJwtProvider;
const RawSignedModel = require('virgil-sdk').RawSignedModel;

const VirgilCrypto = require('virgil-crypto').VirgilCrypto;
const VirgilAccessTokenSigner = require('virgil-crypto').VirgilAccessTokenSigner;
const VirgilCardCrypto = require('virgil-crypto').VirgilCardCrypto;

const configJson = require("./config.json");
const cardCrypto = new VirgilCardCrypto();
const cardVerifier = new VirgilCardVerifier(cardCrypto);
const virgilCrypto = new VirgilCrypto();

const generator = new JwtGenerator({
    appId: configJson.APP_ID,
    apiKeyId: configJson.API_KEY_ID,
    apiKey: virgilCrypto.importPrivateKey(configJson.API_KEY),
    accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
});
const cardManager = new CardManager({
    cardCrypto: cardCrypto,
    cardVerifier: cardVerifier,
    accessTokenProvider: new GeneratorJwtProvider(generator),
    retryOnUnauthorized: true
});

// exports.signIn = (req, res) => {
//     return cardManager
//         .searchCards(req.body.identity)
//         .then(cards => {
//             if (!cards.length) {
//                 return res.status(400).send("Card with this identity don't exists");
//             }
//             if (cards.length > 1) {
//                 return res.status(400).send("There are more then one card with this identity");
//             }
//             res.json({
//                 virgil_card: cardManager.exportCardAsJson(cards[0])
//             });
//         });
// };
exports.signUp = (req, res) => {
    let reqCard = req.body.rawCard;
    if (typeof reqCard === "string") {
        // if card sent in JSON string representation
        reqCard = JSON.parse(reqCard);
    }
    
    // we can publish rawCard created on client and than client can use his
    // private key to sign and encrypt information
    const rawCard = RawSignedModel.fromJson(reqCard);
    
    const identity = JSON.parse(rawCard.contentSnapshot.toString()).identity;
    console.log('------------------------', identity)
    return cardManager
        .searchCards(identity)
        .then(cards => {
            if (cards.length > 0) {
                return res.status(400).send("Card with this identity already exists");
            }
            // then we publish it and return to client as JSON
            return cardManager.publishRawCard(rawCard).then(card => res.json({
                virgil_card: cardManager.exportCardAsJson(card)
            }));
        })
        .catch(() => res.status(500));
};

exports.virgilSearch = (req, res) => {
    console.log("ello poppit!")
    cardManager
        .searchCards(req.body.identity)
        .then(cards => {
            console.log("Inside virgilSearch, search results: ", cards)
            if (cards.length <= 0) {
                return res.status(400).send("Card with this identity does not exist");
            }
            // then we return card to client as JSON
            return res.json({
                virgil_card: cards[0]
            })
        })
        .catch(() => res.status(500));
}

exports.getVirgilJwt = (req, res) => {
    res.json({ token: generator.generateToken(req.body.identity).toString() });
};
