// Variables para mantener el estado de los filtros
let selectedCategory = "Población en situación de pobreza"; // Valor predeterminado
let selectedYear = "2020"; // Valor predeterminado

// Carga el GeoJSON y el CSV, y luego inicia la visualización
Promise.all([
    d3.json("bases/21m.geojson"),
    d3.csv("bases/clean_poverty_data.csv")
]).then(function([geojson, csvData]) {
    const dataMap = new Map(csvData.map(row => [row.CVE_MUN, row]));

    const svg = d3.select("svg");
    const projection = d3.geoMercator().fitSize([960, 600], geojson);
    const pathGenerator = d3.geoPath().projection(projection);

    const interpolateColor = t => d3.interpolateRgb("blue", "white")(1 - t);
    const colorScale = d3.scaleSequential(interpolateColor).domain([0, 100]);

    const paths = svg.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", pathGenerator)
        .attr("class", "mapa");

    // Función para actualizar el mapa con los colores correspondientes a los datos
    function updateMap() {
        const key = `${selectedCategory} ${selectedYear}`;
        paths.transition()
            .duration(500)
            .attr("fill", d => {
                const cve_mun = d.properties.CVE_MUN;
                const munData = dataMap.get(cve_mun);
                const value = munData ? munData[key] : 0;
                return colorScale(value);
            });
    }

    // Llamar a updateMap inmediatamente para aplicar los valores iniciales
    updateMap();

    // Eventos para los elementos del mapa
    paths.on("mouseover", function(event, d) {
        d3.select(this).classed("highlighted", true);
        d3.select("#info").text(d.properties.Municipio || d.properties.NOMGEO).style('display', 'block');
    }).on("mouseout", function() {
        d3.select(this).classed("highlighted", false);
        d3.select("#info").text('').style('display', 'none');
    }).on("click", function(event, d) {
        const cve_mun = d.properties.CVE_MUN;
        const munData = dataMap.get(cve_mun);
        if (munData) { 
            const key = `${selectedCategory} ${selectedYear}`;
            const value = munData[key];
            const isPopulation = selectedCategory === "Población"; // Comprobar si es la categoría Población
            const formattedValue = isPopulation ? value : `${value}%`; // Decidir si añadir el símbolo de porcentaje
            const info = `${selectedCategory} en ${munData.Municipio}: ${formattedValue}`;
            d3.select("#info").html(info).style('display', 'block');
        } else {
            d3.select("#info").text('Información no disponible');
        }
    });

    // Eventos para los elementos de la lista de municipios
    const listContainer = d3.select('#municipality-list ul');
    listContainer.selectAll('li')
        .data(csvData)
        .enter()
        .append('li')
        .text(d => d.Municipio)
        .on('click', function(event, d) {
            const key = `${selectedCategory} ${selectedYear}`;
            const isPopulation = selectedCategory === "Población"; // Comprobar si es la categoría Población
            const value = d[key];
            const formattedValue = isPopulation ? value : `${value}%`; // Decidir si añadir el símbolo de porcentaje
            const info = `${selectedCategory} en ${d.Municipio}: ${formattedValue}`;
            d3.select("#info").html(info).style('display', 'block');
            paths.classed('highlighted', p => p.properties.CVE_MUN === d.CVE_MUN);
        });

    // Manejadores de eventos para los botones de categoría
    d3.selectAll("#category-buttons button").on("click", function() {
        selectedCategory = d3.select(this).attr("data-category");
        d3.selectAll("#category-buttons button").classed("active", false);
        d3.select(this).classed("active", true);
        updateMap();
    });

    // Manejadores de eventos para los botones de año
    d3.selectAll("#year-buttons button").on("click", function() {
        selectedYear = d3.select(this).attr("data-year");
        d3.selectAll("#year-buttons button").classed("active", false);
        d3.select(this).classed("active", true);
        updateMap();
    });
});
