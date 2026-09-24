// Gemeinsame Typen für Server und Client.

export type MonthStatus = 'complete' | 'incomplete' | 'partial' | 'missing' | 'future';

export type ClimateMonth = {
	month: number;
	status: MonthStatus;
	days_in_month: number;
	days_with_data: number;
	temp_avg: number | null;
	temp_min: number | null;
	temp_max: number | null;
	precipitation: number | null;
};

export type Climate = {
	year: number;
	months: ClimateMonth[];
	annual_temp_avg: number | null;
	annual_temp_min: number | null;
	annual_temp_max: number | null;
	annual_precipitation: number;
	issues: number[];
	years_available: number[];
};
