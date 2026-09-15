"use client";

import { QRCodeSVG } from "qrcode.react";

type Props = {
  inscriptionId: string;
  size?: number;
};

export default function InscriptionQRCode({
  inscriptionId,
  size = 190,
}: Props) {
  const qrValue = `CF-INS:${inscriptionId}`;

  return (
    <div className="flex items-center justify-center bg-white">
      <QRCodeSVG
        value={qrValue}
        size={size}
        level="H"
        includeMargin
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}