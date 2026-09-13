"""
Jolly Roger Whitepaper & Project Deck PDF Generator
BUIDL CTC 2026 Fall Hackathon (Creditcoin & Credit Labs)
Theme: Attestcoin Protocol (Universal Smart Contracts - USC)
Track: Tokenized Real-World Assets (RWA) & Cross-Chain Infrastructure
Author: Kafir (@kafirdclxvi / Kafiirr)
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
    PageBreak,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    along with running header and running footer.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        print(f"Total pages rendered: {num_pages}")
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(
                54,
                750,
                "Jolly Roger Whitepaper — Attestcoin Protocol (USC) on Creditcoin CC3",
            )
            self.drawRightString(
                letter[0] - 54,
                750,
                "BUIDL CTC 2026 Fall",
            )
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(54, 742, letter[0] - 54, 742)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 45, letter[0] - 54, 45)

        self.drawString(
            54,
            32,
            "https://www.jollyroger.fun  |  GitHub: https://github.com/Kafiirr/Jollyroger",
        )
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_str)
        self.restoreState()


def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Brand Colors
    PRIMARY = colors.HexColor("#6D28D9")  # Vibrant Purple
    SECONDARY = colors.HexColor("#4338CA")  # Deep Indigo
    DARK_BG = colors.HexColor("#0F172A")  # Dark Slate
    TEXT_MAIN = colors.HexColor("#1E293B")  # Charcoal text
    TEXT_MUTED = colors.HexColor("#475569")  # Muted slate
    BORDER_LIGHT = colors.HexColor("#CBD5E1")
    BG_LIGHT = colors.HexColor("#F8FAFC")
    BG_PURPLE_LIGHT = colors.HexColor("#F5F3FF")
    EMERALD = colors.HexColor("#059669")

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        "Header1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Header2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=DARK_BG,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13.5,
        textColor=TEXT_MAIN,
        spaceAfter=6,
    )

    body_bold = ParagraphStyle(
        "BodyDarkBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        parent=body_style,
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_MAIN,
    )

    code_style = ParagraphStyle(
        "CodeText",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0F172A"),
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=TEXT_MAIN,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell,
        fontName="Helvetica-Bold",
    )

    table_cell_header = ParagraphStyle(
        "TableCellHeader",
        parent=table_cell,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )

    story = []

    # ==================== COVER / HEADER ====================
    story.append(Paragraph("Jolly Roger", title_style))
    story.append(
        Paragraph(
            "Trustless Cross-Chain RWA Graded Collectibles Powered by the Attestcoin Protocol (USC) on Creditcoin CC3",
            subtitle_style,
        )
    )

    # Metadata Banner Table
    meta_data = [
        [
            Paragraph("<b>Hackathon:</b> BUIDL CTC 2026 Fall", table_cell),
            Paragraph("<b>Track:</b> Tokenized RWA & Cross-Chain Infra", table_cell),
            Paragraph("<b>Author:</b> Kafir (@kafirdclxvi)", table_cell),
        ],
        [
            Paragraph("<b>Live Demo:</b> https://www.jollyroger.fun", table_cell),
            Paragraph("<b>Execution Chain:</b> Creditcoin CC3 (102031)", table_cell),
            Paragraph("<b>Source Vault:</b> Ethereum Sepolia (11155111)", table_cell),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[2.3 * inch, 2.7 * inch, 2.0 * inch])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_PURPLE_LIGHT),
            ("BOX", (0, 0), (-1, -1), 1, PRIMARY),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDD6FE")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # ==================== 1. EXECUTIVE SUMMARY ====================
    story.append(Paragraph("1. Executive Summary & Core Thesis", h1_style))
    story.append(
        Paragraph(
            "High-value physical collectibles—primarily certified Gem Mint graded trading cards (PSA, BGS, and CGC slabs)—represent a rapidly expanding <b>$20B+ real-world asset class</b>. However, bringing physical collectibles on-chain has historically suffered from fatal architectural vulnerabilities: reliance on centralized multisig bridge oracles, lack of cryptographic custody provenance, and cold, spreadsheet-like user experiences that alienate mainstream collectors.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>Jolly Roger</b> completely eliminates centralized bridge oracles by deploying the <b>Attestcoin Protocol (Universal Smart Contracts - USC)</b>. Physical cards are escrowed into custody on Ethereum Sepolia, and their custody state roots are directly proven on <b>Creditcoin CC3 Testnet</b> using the native <b>Block Prover Precompile (0x0FD2)</b>. Furthermore, Jolly Roger redefines Web3 onboarding through a tactile, gamified 2D collector sanctuary where 'The Scene IS the Product', enriched with live Fair Market Value (FMV) appraisal data from the <b>Renaiss Protocol API</b>.",
            body_style,
        )
    )

    # Callout Box
    callout_data = [[
        Paragraph(
            "<b>Key Technological Innovation:</b> Unlike conventional cross-chain bridges that depend on off-chain federated signers or relayer committees, Jolly Roger utilizes Creditcoin's native precompile (0x0000000000000000000000000000000000000FD2) to execute synchronous, mathematically verifiable Merkle Patricia inclusion proof validation directly inside the EVM.",
            callout_style,
        )
    ]]
    callout_table = Table(callout_data, colWidths=[7.0 * inch])
    callout_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.75, BORDER_LIGHT),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(callout_table)
    story.append(Spacer(1, 10))

    # ==================== 2. PROBLEM STATEMENT ====================
    story.append(Paragraph("2. The Problem: The Trilemma of Physical RWAs", h1_style))
    story.append(
        Paragraph(
            "Current physical asset tokenization systems suffer from three fundamental deficiencies:",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>1. The Oracle & Bridge Vulnerability:</b> Cross-chain protocols customarily rely on multisig bridge signers (e.g., 5-of-9 committees) or centralized oracle feeds to confirm physical vault deposits. Over $3B has been stolen across DeFi due to compromised bridge keys and malicious oracles.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>2. Disconnected Custody & Counterfeiting:</b> Physical custody receipts lack cryptographic binding to target execution layers. Slabs can be removed from physical vaults while their synthetic tokens continue circulating on-chain.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>3. Broken User Experience & Misrouted Transactions:</b> Conventional Web3 platforms present cold, spreadsheet dashboards without network enforcement. Non-crypto-native collectors frequently send transactions on wrong networks (e.g., Arbitrum vs. Sepolia), resulting in lost assets.",
            bullet_style,
        )
    )

    # Clean Page Break: Page 1 ends cleanly here
    story.append(PageBreak())

    # ==================== 3. ATTESTCOIN ARCHITECTURE ====================
    story.append(Paragraph("3. Technical Architecture & Attestcoin (USC) Protocol", h1_style))
    story.append(
        Paragraph(
            "Jolly Roger operates across a trustless dual-chain infrastructure connecting Ethereum Sepolia and Creditcoin CC3 Testnet without third-party relayer trust:",
            body_style,
        )
    )

    arch_steps = [
        [
            Paragraph("<b>Step</b>", table_cell_header),
            Paragraph("<b>Layer / Chain</b>", table_cell_header),
            Paragraph("<b>Mechanism & Function Call</b>", table_cell_header),
            Paragraph("<b>Cryptographic Security Guarantee</b>", table_cell_header),
        ],
        [
            Paragraph("1. Physical Vault Escrow", table_cell_bold),
            Paragraph("Ethereum Sepolia<br/>(11155111)", table_cell),
            Paragraph("<code>vaultCard(certNumber, cardName, grade, appraisalUsd)</code> in <code>PhysicalVaultEscrow.sol</code>", table_cell),
            Paragraph("Locks card into custody; emits <code>PhysicalCardVaulted</code> with immutable parameters and unique keccak256 asset hash.", table_cell),
        ],
        [
            Paragraph("2. Proof Extraction", table_cell_bold),
            Paragraph("Attestcoin Proof Service", table_cell),
            Paragraph("<code>POST /proof { txHash, chainKey: 1 }</code> via Attestcoin Proof Builder API", table_cell),
            Paragraph("Generates Merkle Patricia Proof entries (siblings, roots) and block continuity lower endpoint digest.", table_cell),
        ],
        [
            Paragraph("3. Native Precompile Verification", table_cell_bold),
            Paragraph("Creditcoin CC3<br/>(102031)", table_cell),
            Paragraph("<code>proveAndVaultCard(...)</code> executes <code>staticcall(0x0FD2, proofData)</code>", table_cell),
            Paragraph("<b>Block Prover Precompile (0x0FD2)</b> verifies Sepolia state root continuity directly at the protocol level.", table_cell),
        ],
        [
            Paragraph("4. Receipt Decoding & Validation", table_cell_bold),
            Paragraph("Creditcoin CC3<br/>(102031)", table_cell),
            Paragraph("<code>EvmV1Decoder.decodeReceiptFields()</code> at <code>0x731c...F9f</code>", table_cell),
            Paragraph("Confirms <code>receiptStatus == 1</code>, matches <code>tx.to == sourceVaultAddress</code>, and checks replay key.", table_cell),
        ],
        [
            Paragraph("5. Atomic RWA Minting", table_cell_bold),
            Paragraph("Creditcoin CC3<br/>(102031)", table_cell),
            Paragraph("<code>CreditcoinRWAVaultASC.sol</code> mints verified RWA token to collector", table_cell),
            Paragraph("Token is cryptographically linked to physical slab with tamper-proof on-chain provenance.", table_cell),
        ],
    ]
    arch_table = Table(arch_steps, colWidths=[1.1 * inch, 1.1 * inch, 2.5 * inch, 2.3 * inch])
    arch_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 0.75, PRIMARY),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(arch_table)
    story.append(Spacer(1, 10))

    # Remove manual page break here so Section 4 stays on Page 2 with Section 3
    story.append(Spacer(1, 10))

    # ==================== 4. LIVE CONTRACT REFERENCE ====================
    story.append(Paragraph("4. Live Deployed Contracts & On-Chain Infrastructure", h1_style))
    story.append(
        Paragraph(
            "Both smart contracts and attestation components are deployed live on-chain and operational:",
            body_style,
        )
    )

    contracts_data = [
        [
            Paragraph("<b>Network</b>", table_cell_header),
            Paragraph("<b>Component / Contract</b>", table_cell_header),
            Paragraph("<b>Verified Address / Endpoint</b>", table_cell_header),
            Paragraph("<b>Explorer / Deployment Tx</b>", table_cell_header),
        ],
        [
            Paragraph("Creditcoin CC3 Testnet<br/>(Chain ID: 102031)", table_cell_bold),
            Paragraph("CreditcoinRWAVaultASC<br/>(Attestcoin Smart Contract)", table_cell),
            Paragraph("<code>0x1a8757a621b0ac08aa91312e282307fb2e21b87f</code>", table_cell),
            Paragraph("Tx: <code>0x66a9d114...f7f0172b</code><br/><font color='#6D28D9'>blockscout.com/address/0x1a87...</font>", table_cell),
        ],
        [
            Paragraph("Ethereum Sepolia<br/>(Chain ID: 11155111)", table_cell_bold),
            Paragraph("PhysicalVaultEscrow<br/>(Source Physical Vault)", table_cell),
            Paragraph("<code>0x0068856c80535b518dbe2a10b56e3c25f9139bb4</code>", table_cell),
            Paragraph("Tx: <code>0xcd53d866...32c5956</code><br/><font color='#6D28D9'>sepolia.etherscan.io/address/0x0068...</font>", table_cell),
        ],
        [
            Paragraph("Creditcoin CC3 Native", table_cell_bold),
            Paragraph("Block Prover Precompile", table_cell),
            Paragraph("<code>0x0000000000000000000000000000000000000FD2</code>", table_cell),
            Paragraph("Native protocol precompile (staticcall)", table_cell),
        ],
        [
            Paragraph("Creditcoin CC3 Verified", table_cell_bold),
            Paragraph("EvmV1Decoder", table_cell),
            Paragraph("<code>0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f</code>", table_cell),
            Paragraph("Decodes transaction & receipt logs", table_cell),
        ],
        [
            Paragraph("Attestcoin Infrastructure", table_cell_bold),
            Paragraph("Proof Builder API", table_cell),
            Paragraph("<code>https://proof-builder.cc3-testnet.creditcoin.network</code>", table_cell),
            Paragraph("Live proof generation service", table_cell),
        ],
    ]
    contracts_table = Table(contracts_data, colWidths=[1.6 * inch, 1.7 * inch, 2.2 * inch, 1.5 * inch])
    contracts_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SECONDARY),
            ("BOX", (0, 0), (-1, -1), 0.75, SECONDARY),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(contracts_table)

    # Clean Page Break: Page 2 ends here (Sections 3 & 4)
    story.append(PageBreak())

    # ==================== 5. KEY FEATURES & UX ====================
    story.append(Paragraph("5. Interactive Features & 2D Collector Experience", h1_style))
    story.append(
        Paragraph(
            "Jolly Roger replaces cold, disconnected spreadsheets with a tactile 2D neon-lit gamer hideout. Every capability maps to an invariant furniture hotspot:",
            body_style,
        )
    )

    features = [
        ("Smartphone Gate (phone):", "Web3 wallet login modal featuring single-line Web3 pills (pulsing emerald network indicator, monospace address, avatar preview), session management, and on-chain Creditcoin Provenance ID (CTC-CC3-${address}) issuance."),
        ("Card Cabinet (cabinet):", "Interactive physical collection shelf querying live Renaiss Protocol API. Features 3D perspective inspection, PSA/BGS grading certifications, and real-time Fair Market Valuations."),
        ("Cross-Chain Vault Escrow (escrow):", "3-step interactive custody vault: (1) Deposit slab into Sepolia escrow, (2) Generate Attestcoin Merkle proof, and (3) Execute CC3 precompile attestation with live progress trackers."),
        ("Chain-of-Custody Ledger (ledger):", "Cryptographic ledger displaying attested slabs, block continuity hashes, and direct one-click links to Sepolia Etherscan and Creditcoin Blockscout."),
        ("Retro Arcade PC (computer):", "Proof-of-play retro volleyball mini-game where collectors earn verified high scores and Creditcoin CC3 tCTC card reward drops."),
        ("Guestbook Note (note):", "On-chain visitor guestbook supporting handwritten notes and direct tCTC tip gifting, guarded by NetworkGuard to prevent accidental cross-chain token loss."),
        ("Trophy Album (album):", "Digital Soulbound Token (SBT) passport recording collector achievements and verified provenance stamps."),
        ("Time-of-Day Dynamic Theme:", "Ambient lighting automatically transitions between bright daytime (06:00-17:59) and dark nighttime (18:00-05:59) based on the visitor's local system time."),
    ]
    for title, desc in features:
        story.append(Paragraph(f"<b>• {title}</b> {desc}", bullet_style))
    story.append(Spacer(1, 6))

    # ==================== 6. WEB3 SAFETY & SECURITY ====================
    story.append(Paragraph("6. Web3 Safety Guardrails & Cryptographic Security", h1_style))
    story.append(
        Paragraph(
            "Multi-chain applications are notoriously prone to user error. Jolly Roger implements defensive, multi-layered safeguards:",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>1. Global NetworkGuard (components/ui/NetworkGuard.tsx):</b> Automatically detects when a connected wallet is on an unsupported chain (e.g., Arbitrum, Polygon, Ethereum Mainnet) and immediately prompts the wallet to switch to Creditcoin CC3 Testnet (102031).",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>2. Transaction-Level Chain ID Pinning:</b> In both Guestbook tipping and Vault Escrow, transactions explicitly pass <code>chainId: 102031</code> and <code>chainId: 11155111</code> to Viem/Wagmi, halting execution immediately if the user rejects network switching.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>3. On-Chain Replay Attack Protection:</b> CreditcoinRWAVaultASC computes <code>queryKey = keccak256(abi.encodePacked(chainKey, blockHeight, transactionIndex))</code>. Once verified, <code>processedQueries[queryKey] = true</code> prevents duplicate minting or replayed proofs.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>4. Zero Mock Data Standard:</b> All slab grades, certifications, and high-resolution card artwork are pulled dynamically from live APIs (<code>api.renaiss.xyz/v0/</code>), ensuring real market valuation integrity.",
            bullet_style,
        )
    )

    # Clean Page Break: Page 3 ends here (Sections 5 & 6)
    story.append(PageBreak())

    # ==================== 7. TECH STACK & ROADMAP ====================
    story.append(Paragraph("7. Tech Stack & Future Roadmap", h1_style))
    story.append(
        Paragraph(
            "<b>Technical Architecture:</b> Built with Next.js 14 App Router, TypeScript, Tailwind CSS (Dark Base #0E0C17 + Neon Purple #B78CFF), Viem 2, Wagmi 2, RainbowKit, Solidity ^0.8.24, Supabase (PostgreSQL with RLS), Cloudflare R2, and Vercel.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>Phase 1 (Hackathon Milestone - Completed):</b> Dual-chain deployment on Ethereum Sepolia & Creditcoin CC3 Testnet, Attestcoin Block Prover Precompile (0x0FD2) integration, dynamic Renaiss Protocol API integration, and global NetworkGuard auto-switch protection.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>Phase 2 (Mainnet Expansion):</b> Production deployment on Creditcoin CC3 Mainnet in partnership with licensed physical vault custodians (PSA Vault, PWCC, Collectors Universe), enabling direct institutional custody intake.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "<b>Phase 3 (DeFi & Financialization):</b> Collateralized lending against attested Gem Mint slabs, peer-to-peer decentralized slab swapping, and ERC-20 fractionalization pools for ultra-rare holy grail cards (e.g. Manga Luffy).",
            bullet_style,
        )
    )
    story.append(Spacer(1, 8))

    # ==================== 8. TEAM & CONCLUSION ====================
    story.append(Paragraph("8. Solo Builder & Project Verification", h1_style))
    story.append(
        Paragraph(
            "Jolly Roger was architected and built from scratch by solo developer <b>Kafir (@kafirdclxvi / Kafiirr)</b>, encompassing dual-chain smart contract engineering, native Attestcoin precompile verification, Next.js frontend development, 2D scene orchestration, and custom Web3 UI/UX design.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "By mathematically replacing centralized multisig bridge oracles with the <b>Attestcoin Protocol (USC)</b>, Jolly Roger sets a new benchmark for trustless physical Real-World Assets on Creditcoin CC3.",
            body_style,
        )
    )
    story.append(Spacer(1, 8))

    # Hackathon Submission Checklist & Quick Links Box
    summary_box_data = [
        [
            Paragraph("<b>BUIDL CTC 2026 Fall Hackathon Verification Checklist</b>", table_cell_header),
            Paragraph("<b>Status & Direct URLs</b>", table_cell_header),
        ],
        [
            Paragraph("<b>Track & Theme</b>", table_cell_bold),
            Paragraph("Tokenized RWA & Cross-Chain Infrastructure — Attestcoin Protocol (USC)", table_cell),
        ],
        [
            Paragraph("<b>Live Web Application</b>", table_cell_bold),
            Paragraph("<font color='#6D28D9'>https://www.jollyroger.fun</font> (Fully functional)", table_cell),
        ],
        [
            Paragraph("<b>Open-Source GitHub Repository</b>", table_cell_bold),
            Paragraph("<font color='#6D28D9'>https://github.com/Kafiirr/Jollyroger</font> (Includes comprehensive README)", table_cell),
        ],
        [
            Paragraph("<b>Creditcoin CC3 Smart Contract</b>", table_cell_bold),
            Paragraph("<code>0x1a8757a621b0ac08aa91312e282307fb2e21b87f</code> (Precompile 0x0FD2 verified)", table_cell),
        ],
        [
            Paragraph("<b>Ethereum Sepolia Escrow Contract</b>", table_cell_bold),
            Paragraph("<code>0x0068856c80535b518dbe2a10b56e3c25f9139bb4</code> (Live deployed vault)", table_cell),
        ],
        [
            Paragraph("<b>Project Whitepaper (PDF URL)</b>", table_cell_bold),
            Paragraph("<font color='#6D28D9'>https://www.jollyroger.fun/whitepaper.pdf</font>", table_cell),
        ],
    ]
    summary_box = Table(summary_box_data, colWidths=[2.8 * inch, 4.2 * inch])
    summary_box.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, PRIMARY),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_PURPLE_LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ])
    )
    story.append(summary_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Whitepaper successfully generated at: {filename}")


if __name__ == "__main__":
    out_dir = "/home/kafir/renaiss/public/docs"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "jollyroger_whitepaper.pdf")
    build_pdf(out_path)

    # Also copy to public/whitepaper.pdf for convenient short URL
    root_public = "/home/kafir/renaiss/public/whitepaper.pdf"
    import shutil
    shutil.copyfile(out_path, root_public)
    print(f"Copied to root public URL: {root_public}")

    # Render PNG images of each page
    try:
        import fitz
        doc_fitz = fitz.open(out_path)
        for i, page in enumerate(doc_fitz):
            pix = page.get_pixmap(dpi=150)
            img_path = os.path.join(out_dir, f"page_{i+1}.png")
            pix.save(img_path)
        print(f"Rendered {len(doc_fitz)} page images to {out_dir}")
    except Exception as e:
        print(f"Notice: image rendering skipped: {e}")
