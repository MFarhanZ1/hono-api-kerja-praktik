export default class TahunAjaranHelper {
	public static findSekarang(): string {
		// return 20241 for 2024/2025 Ganjil and return 20242 for 2024/2025 Genap create auto with current date
        const date = new Date();
        return date.getMonth() >= 9 ? `${date.getFullYear()}1` : `${date.getFullYear() - 1}2`;
	}

    public static parseStringNameByCode(code: string): string {
        const tahun = parseInt(code.slice(0, 4));
        const semester = parseInt(code.slice(4));
        return `${tahun}/${tahun + 1} ${semester === 1 ? "Ganjil" : "Genap"}`;
    }

}
