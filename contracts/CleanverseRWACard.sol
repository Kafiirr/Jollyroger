// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CleanverseRWACard
 * @notice Monad Testnet Smart Contract for Tokenizing One Piece Physical RWA Assets
 * @dev Integrated with Cleanverse CVI & CVA Origination Proofs
 */
contract CleanverseRWACard {
    string public name = "Cleanverse One Piece RWA Collectibles";
    string public symbol = "CVA-OPCARD";
    uint256 public totalSupply;
    address public owner;

    struct RWACardDetails {
        string cvaAssetId;
        bytes32 traceabilityHash;
        uint256 mintedAt;
    }

    mapping(uint256 => address) private _owners;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => RWACardDetails) public cardDetails;

    event RWACardMinted(
        address indexed to,
        uint256 indexed tokenId,
        string cvaAssetId,
        bytes32 traceabilityHash
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized to mint");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mintRWACard(
        address to,
        string memory uri,
        string memory cvaAssetId,
        bytes32 traceabilityHash
    ) external payable onlyOwner returns (uint256) {
        totalSupply++;
        uint256 newTokenId = totalSupply;

        _owners[newTokenId] = to;
        _tokenURIs[newTokenId] = uri;
        cardDetails[newTokenId] = RWACardDetails({
            cvaAssetId: cvaAssetId,
            traceabilityHash: traceabilityHash,
            mintedAt: block.timestamp
        });

        emit RWACardMinted(to, newTokenId, cvaAssetId, traceabilityHash);
        return newTokenId;
    }

    function batchMintRWACards(
        address to,
        string[] memory uris,
        string[] memory cvaAssetIds,
        bytes32[] memory traceabilityHashes
    ) external payable onlyOwner returns (uint256[] memory) {
        require(
            uris.length == cvaAssetIds.length && cvaAssetIds.length == traceabilityHashes.length,
            "Array lengths mismatch"
        );

        uint256[] memory tokenIds = new uint256[](uris.length);

        for (uint256 i = 0; i < uris.length; i++) {
            totalSupply++;
            uint256 newTokenId = totalSupply;

            _owners[newTokenId] = to;
            _tokenURIs[newTokenId] = uris[i];
            cardDetails[newTokenId] = RWACardDetails({
                cvaAssetId: cvaAssetIds[i],
                traceabilityHash: traceabilityHashes[i],
                mintedAt: block.timestamp
            });

            emit RWACardMinted(to, newTokenId, cvaAssetIds[i], traceabilityHashes[i]);
            tokenIds[i] = newTokenId;
        }

        return tokenIds;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
}
