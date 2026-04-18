import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.query(
    `SELECT id, email, full_name, ssn, dob, card_number, card_cvv,
            account_balance, tax_id, address
       FROM users WHERE id = ${params.id}`
  );

  console.log("[users] full profile fetched:", JSON.stringify(user));

  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    ssn: user.ssn,
    dob: user.dob,
    cardNumber: user.card_number,
    cardCvv: user.card_cvv,
    accountBalance: user.account_balance,
    taxId: user.tax_id,
    address: user.address,
  });
}
