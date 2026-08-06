/**
* PSA Public API  (: B)
*       →
 * https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
 */
export interface PsaCert {
  certNumber: string;
  cardName: string;
  setName: string;
  year: string;
  grade: string;
  populationHigher: number;
  imageUrlFront?: string;
}

export async function getCertByNumber(certNumber: string): Promise<PsaCert> {
  const res = await fetch(
    `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
    { headers: { Authorization: `Bearer ${process.env.PSA_API_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`PSA API ${res.status}`);
  const data = await res.json();
  // TODO:
  return data as PsaCert;
}
