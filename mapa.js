// Botones y escala de rojos. Variables para mantener el estado de los filtros
let selectedCategory = "Población en situación de pobreza"; // Valor predeterminado
let selectedYear = "2020"; // Valor predeterminado

// Carga el GeoJSON y el CSV, y luego inicia la visualización
Promise.all([
    d3.json("bases/21m.geojson"),
    d3.csv("bases/clean_poverty_data.csv")
]).then(function([geojson, csvData]) {
    // Crea un mapa de datos para acceso rápido por CVE_MUN
    const dataMap = new Map(csvData.map(row => [row.CVE_MUN, row]));

    const svg = d3.select("svg");
    const projection = d3.geoMercator().fitSize([960, 600], geojson);
    const pathGenerator = d3.geoPath().projection(projection);

    // Interpolador personalizado de rojo a blanco
    const interpolateColor = t => d3.interpolateRgb("blue", "white")(1 - t);

    // Escala de colores usando nuestro interpolador personalizado
    const colorScale = d3.scaleSequential(interpolateColor)
        .domain([0, 100]); // Asumiendo que el porcentaje de pobreza va de 0 a 100

    // Añadir los caminos para cada entidad geográfica
    svg.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", pathGenerator)
        .attr("class", "mapa");

    // Inicializa la visualización con los valores predeterminados
    updateMap();

    // Función para actualizar el mapa basada en la categoría y el año seleccionados
    function updateMap() {
        const key = `${selectedCategory} ${selectedYear}`;
        svg.selectAll("path")
            .transition()
            .duration(500)
            .attr("fill", d => {
                const value = dataMap.get(d.properties.CVE_MUN) ? dataMap.get(d.properties.CVE_MUN)[key] : null;
                return value ? colorScale(value) : "#ccc"; // Usa un color por defecto si no hay datos
            });
    }

    // Manejadores de eventos para los botones de año
    d3.selectAll("#year-buttons button").on("click", function() {
        selectedYear = d3.select(this).attr("data-year");
        // Actualiza los botones activos
        d3.selectAll("#year-buttons button").classed("active", false);
        d3.select(this).classed("active", true);
        updateMap();
    });

    // Manejadores de eventos para los botones de categoría
    d3.selectAll("#category-buttons button").on("click", function() {
        selectedCategory = d3.select(this).attr("data-category");
        // Actualiza los botones activos
        d3.selectAll("#category-buttons button").classed("active", false);
        d3.select(this).classed("active", true);
        updateMap();
    });

    // Interactividad para mostrar datos al pasar el cursor
    svg.selectAll("path")
        .on("mouseover", (event, d) => {
            const cve_mun = d.properties.CVE_MUN;
            const key = `${selectedCategory} ${selectedYear}`;
            const value = dataMap.get(cve_mun) ? dataMap.get(cve_mun)[key] : null;
            d3.select("#info").text(`${selectedCategory} en ${d.properties.NOMGEO}: ${value}%`);
        })
        .on("mouseout", () => d3.select("#info").text(""));


    console.log(csvData.map(row => [row['Población con ingreso inferior a la línea de pobreza por ingresos']]));
    console.log(Object.keys(csvData[0]));

});
