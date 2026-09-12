// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title INativeQueryVerifier
 * @notice Attestcoin Protocol Block Prover Precompile interface at 0x0FD2
 */
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 value;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verify(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verifyAndEmit(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}

/**
 * @title IEvmV1Decoder
 * @notice Decoder contract deployed on Creditcoin CC3 Testnet at 0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f
 */
interface IEvmV1Decoder {
    struct ReceiptFields {
        uint8 receiptStatus;
        uint256 gasUsed;
        bytes logsBloom;
    }

    struct CommonTxFields {
        uint256 nonce;
        uint256 gasPrice;
        uint256 gasLimit;
        address to;
        uint256 value;
        bytes data;
        address from;
    }

    function decodeReceiptFields(bytes calldata encodedTransaction) external pure returns (ReceiptFields memory);
    function decodeCommonTxFields(bytes calldata encodedTransaction) external pure returns (CommonTxFields memory);
}

/**
 * @title CreditcoinRWAVaultASC
 * @notice Jolly Roger Attestcoin Smart Contract deployed on Creditcoin CC3 Testnet
 * @dev Verifies physical RWA card vaulting transactions from Ethereum Sepolia using Block Prover Precompile 0x0FD2
 */
contract CreditcoinRWAVaultASC {
    string public name = "Jolly Roger Attestcoin RWA Collectibles";
    string public symbol = "JR-ATTEST-RWA";

    // CC3 Block Prover Precompile address
    address public constant BLOCK_PROVER_ADDRESS = 0x0000000000000000000000000000000000000FD2;
    INativeQueryVerifier public immutable VERIFIER;
    IEvmV1Decoder public immutable DECODER;

    // Expected Source Chain Key: 1 (Ethereum Sepolia on CC3 Testnet)
    uint64 public constant EXPECTED_CHAIN_KEY = 1;

    address public owner;
    address public sourceVaultAddress;
    uint256 public totalVaultedCards;

    struct CardMetadata {
        uint256 certNumber;
        string cardName;
        string grade;
        uint256 appraisalUsd;
        string uri;
    }

    struct RWACardDetails {
        address originalOwner;
        uint256 certNumber;
        string cardName;
        string grade;
        uint256 appraisalUsd;
        bytes32 sourceTxHash;
        uint256 attestedAt;
        bool crossChainVerified;
    }

    mapping(uint256 => address) private _owners;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => RWACardDetails) public cardDetails;
    mapping(bytes32 => bool) public processedQueries;

    event RWACardAttested(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 indexed certNumber,
        string cardName,
        uint256 appraisalUsd,
        bytes32 queryKey
    );

    event DirectCardMinted(
        address indexed to,
        uint256 indexed tokenId,
        string cardName,
        string grade,
        uint256 certNumber
    );

    event BatchCardsMinted(
        address indexed to,
        uint256 startTokenId,
        uint256 count
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _decoderAddress, address _sourceVaultAddress) {
        owner = msg.sender;
        VERIFIER = INativeQueryVerifier(BLOCK_PROVER_ADDRESS);
        DECODER = IEvmV1Decoder(_decoderAddress);
        sourceVaultAddress = _sourceVaultAddress;
    }

    function setSourceVault(address _sourceVault) external onlyOwner {
        sourceVaultAddress = _sourceVault;
    }

    /**
     * @notice Proves a Sepolia vaulting transaction via Creditcoin Block Prover Precompile and mints RWA token
     */
    function proveAndVaultCard(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots,
        CardMetadata calldata card
    ) external returns (uint256 tokenId) {
        require(chainKey == EXPECTED_CHAIN_KEY, "Invalid source chain");

        // 1. Calculate transaction index & generate unique replay protection key
        uint256 transactionIndex = _calculateTransactionIndex(siblings);
        bytes32 queryKey = keccak256(abi.encodePacked(chainKey, blockHeight, transactionIndex));
        require(!processedQueries[queryKey], "Query already processed");

        // 2. Synchronously verify inclusion & continuity proofs via Block Prover Precompile at 0x0FD2
        INativeQueryVerifier.MerkleProof memory merkleProof = INativeQueryVerifier.MerkleProof({
            root: merkleRoot,
            siblings: siblings
        });

        INativeQueryVerifier.ContinuityProof memory continuityProof = INativeQueryVerifier.ContinuityProof({
            lowerEndpointDigest: lowerEndpointDigest,
            roots: continuityRoots
        });

        bool verified = VERIFIER.verifyAndEmit(
            chainKey,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "Attestcoin proof verification failed");

        // Replay protection flag
        processedQueries[queryKey] = true;

        // 3. Cryptographic validation of transaction receipt
        if (address(DECODER) != address(0)) {
            IEvmV1Decoder.ReceiptFields memory receipt = DECODER.decodeReceiptFields(encodedTransaction);
            require(receipt.receiptStatus == 1, "Source transaction failed on Sepolia");

            if (sourceVaultAddress != address(0)) {
                IEvmV1Decoder.CommonTxFields memory txFields = DECODER.decodeCommonTxFields(encodedTransaction);
                require(txFields.to == sourceVaultAddress, "Target contract mismatch");
            }
        }

        // 4. Mint verified RWA record on Creditcoin CC3
        totalVaultedCards++;
        tokenId = totalVaultedCards;

        _owners[tokenId] = msg.sender;
        _tokenURIs[tokenId] = card.uri;
        cardDetails[tokenId] = RWACardDetails({
            originalOwner: msg.sender,
            certNumber: card.certNumber,
            cardName: card.cardName,
            grade: card.grade,
            appraisalUsd: card.appraisalUsd,
            sourceTxHash: keccak256(encodedTransaction),
            attestedAt: block.timestamp,
            crossChainVerified: true
        });

        emit RWACardAttested(
            msg.sender,
            tokenId,
            card.certNumber,
            card.cardName,
            card.appraisalUsd,
            queryKey
        );

        return tokenId;
    }

    /**
     * @notice Native direct mint on Creditcoin (for mini-game rewards & instant collection showcase)
     */
    function mintDirectCard(
        address to,
        string calldata cardName,
        string calldata grade,
        uint256 certNumber,
        uint256 appraisalUsd,
        string calldata uri
    ) external returns (uint256) {
        totalVaultedCards++;
        uint256 newTokenId = totalVaultedCards;

        _owners[newTokenId] = to;
        _tokenURIs[newTokenId] = uri;
        cardDetails[newTokenId] = RWACardDetails({
            originalOwner: to,
            certNumber: certNumber,
            cardName: cardName,
            grade: grade,
            appraisalUsd: appraisalUsd,
            sourceTxHash: bytes32(0),
            attestedAt: block.timestamp,
            crossChainVerified: false
        });

        emit DirectCardMinted(to, newTokenId, cardName, grade, certNumber);
        return newTokenId;
    }

    /**
     * @notice Native batch mint on Creditcoin CC3 for lightning fast multi-card minting in a single transaction
     */
    function batchMintCards(
        address to,
        CardMetadata[] calldata cards
    ) external returns (uint256[] memory tokenIds) {
        uint256 count = cards.length;
        require(count > 0, "Empty batch");
        require(count <= 50, "Batch too large");

        tokenIds = new uint256[](count);
        uint256 currentId = totalVaultedCards;

        for (uint256 i = 0; i < count; i++) {
            currentId++;
            tokenIds[i] = currentId;

            _owners[currentId] = to;
            _tokenURIs[currentId] = cards[i].uri;
            cardDetails[currentId] = RWACardDetails({
                originalOwner: to,
                certNumber: cards[i].certNumber,
                cardName: cards[i].cardName,
                grade: cards[i].grade,
                appraisalUsd: cards[i].appraisalUsd,
                sourceTxHash: bytes32(0),
                attestedAt: block.timestamp,
                crossChainVerified: false
            });

            emit DirectCardMinted(to, currentId, cards[i].cardName, cards[i].grade, cards[i].certNumber);
        }

        totalVaultedCards = currentId;
        emit BatchCardsMinted(to, tokenIds[0], count);
        return tokenIds;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address cardOwner = _owners[tokenId];
        require(cardOwner != address(0), "Token does not exist");
        return cardOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function _calculateTransactionIndex(
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings
    ) internal pure returns (uint256 index) {
        for (uint256 i = 0; i < siblings.length; i++) {
            if (siblings[i].isLeft) {
                index |= (1 << i);
            }
        }
        return index;
    }
}
