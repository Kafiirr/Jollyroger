// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PhysicalVaultEscrow
 * @notice Source chain contract on Ethereum Sepolia for vaulting physical graded RWA cards
 * @dev Deposits emit events that are attested on Creditcoin CC3 via the Attestcoin Protocol
 */
contract PhysicalVaultEscrow {
    string public name = "Jolly Roger Physical RWA Vault";
    string public symbol = "JR-VAULT";
    address public owner;
    uint256 public totalVaulted;

    struct VaultedCard {
        address owner;
        uint256 certNumber;
        string cardName;
        string grade;
        uint256 appraisalUsd;
        uint256 vaultedAt;
    }

    mapping(uint256 => VaultedCard) public vaultedCards;

    event PhysicalCardVaulted(
        address indexed owner,
        uint256 indexed certNumber,
        string cardName,
        string grade,
        uint256 appraisalUsd,
        bytes32 assetHash
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Vaults a physical card into custody on Ethereum Sepolia
     * @param certNumber PSA / grading certification number
     * @param cardName Card title (e.g., 'Manga Shanks OP01-120')
     * @param grade PSA grade string (e.g., 'PSA 10')
     * @param appraisalUsd Estimated market value in USD cents
     */
    function vaultCard(
        uint256 certNumber,
        string calldata cardName,
        string calldata grade,
        uint256 appraisalUsd
    ) external returns (uint256) {
        totalVaulted++;
        uint256 vaultId = totalVaulted;

        vaultedCards[vaultId] = VaultedCard({
            owner: msg.sender,
            certNumber: certNumber,
            cardName: cardName,
            grade: grade,
            appraisalUsd: appraisalUsd,
            vaultedAt: block.timestamp
        });

        bytes32 assetHash = keccak256(
            abi.encodePacked(msg.sender, certNumber, cardName, grade, appraisalUsd, block.timestamp)
        );

        emit PhysicalCardVaulted(
            msg.sender,
            certNumber,
            cardName,
            grade,
            appraisalUsd,
            assetHash
        );

        return vaultId;
    }
}
