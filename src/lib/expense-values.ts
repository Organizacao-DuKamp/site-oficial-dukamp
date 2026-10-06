export async function loadAllExpenseValues(db: any) {
  const rows: any[] = [];
  for (let offset = 0; ; ) {
    const { data, error } = await db
      .from("dukamp_expense_monthly_values")
      .select("year,month,subcategory_code,amount")
      .order("year", { ascending: true })
      .order("month", { ascending: true })
      .order("subcategory_code", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    offset += data.length;
  }
  return { data: rows, error: null };
}
