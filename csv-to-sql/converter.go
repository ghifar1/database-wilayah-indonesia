package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strconv"
)

func ConvertProvinsi() {
	file, err := os.Open("../data/provinsi.csv")
	if err != nil {
		log.Fatal("Failed to open file provinsi.csv: ", err)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal("Failed to read file provinsi.csv: ", err)
	}

	var sqlStmts []string
	for _, record := range records[1:] {
		kodeProvinsi := record[0]
		namaProvinsi := record[1]

		kodeProvinsiInt, err := strconv.Atoi(kodeProvinsi)
		if err != nil {
			log.Fatal("Failed to convert kode provinsi to int: ", err)
		}

		stmt := fmt.Sprintf(`(%d, "%s")`, kodeProvinsiInt, namaProvinsi)
		sqlStmts = append(sqlStmts, stmt)
	}

	sqlFile, err := os.Create("../data/provinsi.sql")
	if err != nil {
		log.Fatal("Failed to create sql file provinsi.sql: ", err)
	}

	defer sqlFile.Close()

	sqlFile.WriteString("INSERT INTO provinces (id, name) VALUES\n")
	for i, stmt := range sqlStmts {
		if i == len(sqlStmts)-1 {
			sqlFile.WriteString(stmt + ";\n")
		} else {
			sqlFile.WriteString(stmt + ",\n")
		}
	}

	log.Println("Successfully convert provinsi.csv to provinsi.sql")
}

func ConvertKabupatenKota() {
	file, err := os.Open("../data/kabupaten-kota.csv")
	if err != nil {
		log.Fatal("Failed to open file kabupaten-kota.csv: ", err)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal("Failed to read file kabupaten-kota.csv: ", err)
	}

	var sqlStmts []string
	for _, record := range records[1:] {
		kodeProvinsi := record[0]
		kodeKabupatenKota := record[2]
		namaKabupatenKota := record[3]

		kodeProvinsiInt, err := strconv.Atoi(kodeProvinsi)
		if err != nil {
			log.Fatal("Failed to convert kode provinsi to int: ", err)
		}

		kodeKabupatenKotaInt, err := strconv.Atoi(kodeKabupatenKota)
		if err != nil {
			log.Fatal("Failed to convert kode kabupaten kota to int: ", err)
		}

		stmt := fmt.Sprintf(`(%d, %d, "%s")`, kodeKabupatenKotaInt, kodeProvinsiInt, namaKabupatenKota)
		sqlStmts = append(sqlStmts, stmt)
	}

	sqlFile, err := os.Create("../data/kabupaten-kota.sql")
	if err != nil {
		log.Fatal("Failed to create sql file kabupaten-kota.sql: ", err)
	}

	defer sqlFile.Close()

	sqlFile.WriteString("INSERT INTO cities (id, province_id, name) VALUES\n")
	for i, stmt := range sqlStmts {
		if i == len(sqlStmts)-1 {
			sqlFile.WriteString(stmt + ";\n")
		} else {
			sqlFile.WriteString(stmt + ",\n")
		}
	}

	log.Println("Successfully convert kabupaten-kota.csv to kabupaten-kota.sql")
}

func ConvertKecamatan() {
	file, err := os.Open("../data/kecamatan.csv")
	if err != nil {
		log.Fatal("Failed to open file kecamatan.csv: ", err)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal("Failed to read file kecamatan.csv: ", err)
	}

	var sqlStmts []string
	for _, record := range records[1:] {
		kodeKabupatenKota := record[0]
		kodeKecamatan := record[2]
		namaKecamatan := record[3]

		kodeKabupatenKotaInt, err := strconv.Atoi(kodeKabupatenKota)
		if err != nil {
			log.Fatal("Failed to convert kode kabupaten kota to int: ", err)
		}

		kodeKecamatanInt, err := strconv.Atoi(kodeKecamatan)
		if err != nil {
			log.Fatal("Failed to convert kode kecamatan to int: ", err)
		}

		stmt := fmt.Sprintf(`(%d, %d, "%s")`, kodeKecamatanInt, kodeKabupatenKotaInt, namaKecamatan)
		sqlStmts = append(sqlStmts, stmt)
	}

	sqlFile, err := os.Create("../data/kecamatan.sql")
	if err != nil {
		log.Fatal("Failed to create sql file kecamatan.sql: ", err)
	}

	defer sqlFile.Close()

	sqlFile.WriteString("INSERT INTO districts (id, city_id, name) VALUES\n")
	for i, stmt := range sqlStmts {
		if i == len(sqlStmts)-1 {
			sqlFile.WriteString(stmt + ";\n")
		} else {
			sqlFile.WriteString(stmt + ",\n")
		}
	}

	log.Println("Successfully convert kecamatan.csv to kecamatan.sql")
}

func ConvertKelurahanDesa() {
	file, err := os.Open("../data/kelurahan-desa.csv")
	if err != nil {
		log.Fatal("Failed to open file kelurahan-desa.csv: ", err)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal("Failed to read file kelurahan-desa.csv: ", err)
	}

	var sqlStmts []string
	for _, record := range records[1:] {
		kodeKecamatan := record[0]
		kodeKelurahanDesa := record[2]
		namaKelurahanDesa := record[3]

		kodeKecamatanInt, err := strconv.Atoi(kodeKecamatan)
		if err != nil {
			log.Fatal("Failed to convert kode kecamatan to int: ", err)
		}

		kodeKelurahanDesaInt, err := strconv.Atoi(kodeKelurahanDesa)
		if err != nil {
			log.Fatal("Failed to convert kode kelurahan desa to int: ", err)
		}

		stmt := fmt.Sprintf(`(%d, %d, "%s")`, kodeKelurahanDesaInt, kodeKecamatanInt, namaKelurahanDesa)
		sqlStmts = append(sqlStmts, stmt)
	}

	sqlFile, err := os.Create("../data/kelurahan-desa.sql")
	if err != nil {
		log.Fatal("Failed to create sql file kelurahan-desa.sql: ", err)
	}

	defer sqlFile.Close()

	sqlFile.WriteString("INSERT INTO villages (id, district_id, name) VALUES\n")
	for i, stmt := range sqlStmts {
		if i == len(sqlStmts)-1 {
			sqlFile.WriteString(stmt + ";\n")
		} else {
			sqlFile.WriteString(stmt + ",\n")
		}
	}

	log.Println("Successfully convert kelurahan-desa.csv to kelurahan-desa.sql")
}
