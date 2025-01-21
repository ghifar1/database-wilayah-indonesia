package main

import "log"

func main() {
	log.Println("-- Start converting CSV to SQL --")
	ConvertProvinsi()
	ConvertKabupatenKota()
	ConvertKecamatan()
	ConvertKelurahanDesa()
	log.Println("-- Finish converting CSV to SQL --")
}
