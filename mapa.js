// Variables para mantener el estado de los filtros
let selectedCategory = "Población"; // Valor predeterminado
let selectedYear = "2020"; // Valor predeterminado

// Carga el GeoJSON y el CSV, y luego inicia la visualización
Promise.all([
    d3.json("bases/21m.geojson"),
    d3.csv("bases/clean_poverty_data.csv")
]).then(function([geojson, csvData]) {
    const dataMap = new Map(csvData.map(row => [row.CVE_MUN, row]));

    const width = 960;
    const height = 600;

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    const svg = d3.select("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .attr("style", "max-width: 100%; height: auto;")
        .on("click", reset);

    const projection = d3.geoMercator().fitSize([width, height], geojson);
    const pathGenerator = d3.geoPath().projection(projection);

    const g = svg.append("g");

    const categoryMap = {
        "Población": "Población",
        "Pobreza": "Población en situación de pobreza",
        "Ingresos": "Población con ingreso inferior a la línea de pobreza por ingresos",
        "Educación": "Población con carencia por rezago educativo",
        "Salud": "Población con carencia por acceso a los servicios de salud",
        "Seg. Social": "Población con carencia por acceso a la seguridad social",
        "Vivienda": "Población con carencia por calidad y espacios de la vivienda",
        "Servicios": "Población con carencia por acceso a los servicios básicos en la vivienda",
        "Alimentación": "Población con carencia por acceso a la alimentación"
    };

    const categoryMapInverse = {};
    for (const key in categoryMap) {
        categoryMapInverse[categoryMap[key]] = key;
    }

    const categoryButtons = Object.keys(categoryMap);

    let minValue, maxValue;
    const updateMinMaxValues = () => {
        const key = `${selectedCategory} ${selectedYear}`;
        [minValue, maxValue] = d3.extent(csvData, d => parseFloat(d[key]));
    };

    const colorScale = d3.scaleSequential(d3.interpolateBlues);

    const paths = g.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", pathGenerator)
        .attr("class", "mapa")
        .on("click", clicked);

    paths.append("title")
        .text(d => d.properties.Municipio || d.properties.NOMGEO);

    function updateMap() {
        colorScale.domain([minValue, maxValue]);

        paths.transition()
            .duration(500)
            .attr("fill", d => {
                const cve_mun = d.properties.CVE_MUN;
                const munData = dataMap.get(cve_mun);
                const key = `${selectedCategory} ${selectedYear}`;
                const value = munData ? munData[key] : 0;
                return colorScale(value);
            });
    }

    updateMinMaxValues();
    updateMap();

    const listContainer = d3.select('#municipality-list ul');
    
    listContainer.selectAll('li')
        .data(csvData)
        .enter()
        .append('li')
        .attr('data-cve', d => d.CVE_MUN)
        .text(d => d.Municipio)
        .on('mouseover', function(event, d) {
            const cve_mun = d.CVE_MUN;
            paths.filter(p => p.properties.CVE_MUN === cve_mun).classed('highlighted', true);
            d3.select(this).classed('highlighted', true);
        })
        .on('mouseout', function() {
            paths.classed("highlighted", false);
            d3.selectAll("#municipality-list li").classed("highlighted", false);
        })
        .on('click', function(event, d) {
            const cve_mun = d.CVE_MUN;
            const munData = dataMap.get(cve_mun);
            if (munData) {
                showInfo({ properties: { CVE_MUN: cve_mun, Municipio: munData.Municipio } });
            } else {
                hideInfo();
            }
            paths.filter(p => p.properties.CVE_MUN === cve_mun).dispatch('click');
        });

    const categoryButtonsContainer = d3.select("#category-buttons");

    categoryButtonsContainer
        .selectAll("button")
        .data(categoryButtons)
        .enter()
        .append("button")
        .text(d => d)
        .attr("data-category", d => d)
        .on("click", function() {
            selectedCategory = categoryMap[d3.select(this).attr("data-category")];
            d3.selectAll("#category-buttons button").classed("active", false);
            d3.select(this).classed("active", true);
            updateMinMaxValues();
            updateMap();
        });

    d3.select("#year-buttons-container")
        .selectAll("button")
        .data(["2010", "2015", "2020"])
        .enter()
        .append("button")
        .text(d => "Año " + d)
        .attr("data-year", d => d)
        .on("click", function() {
            selectedYear = d3.select(this).attr("data-year");
            d3.selectAll("#year-buttons-container button").classed("active", false);
            d3.select(this).classed("active", true);
            updateMinMaxValues();
            updateMap();
        });

        function showInfo(d) {
            const cve_mun = d.properties.CVE_MUN;
            const munData = dataMap.get(cve_mun);
            if (munData) {
                const key = `${selectedCategory} ${selectedYear}`;
                const value = munData[key];
                const isPopulation = categoryMapInverse[selectedCategory] === "Población";
                let formattedValue;
                let unit;
                if (isPopulation) {
                    formattedValue = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    unit = "habitantes";
                } else {
                    formattedValue = `${Math.round(value)}%`;
                    unit = "";
                }
                const info = `${categoryMap[categoryMapInverse[selectedCategory]]} en ${munData.Municipio} (${selectedYear}): ${formattedValue} ${unit}`;
        
                const centroid = pathGenerator.centroid(d);
                const x = centroid[0];
                const y = centroid[1];
        
                const dialog = d3.select("svg")
                    .append("g")
                    .attr("class", "dialog")
                    .attr("transform", `translate(${x}, ${y})`);
        
                const rect = dialog.append("rect")
                    .attr("rx", 10)
                    .attr("ry", 10)
                    .attr("fill", "white")
                    .attr("stroke", "black")
                    .attr("stroke-width", 2);
        
                const text = dialog.append("text")
                    .attr("x", 10)
                    .attr("y", 20)
                    .text(info);
        
                const bbox = text.node().getBBox();
                rect.attr("width", bbox.width + 20)
                    .attr("height", bbox.height + 20);
        
                dialog.append("polygon")
                    .attr("points", "0,0 10,-10, 20,0")
                    .attr("fill", "white")
                    .attr("stroke", "black")
                    .attr("stroke-width", 2)
                    .attr("transform", `translate(${bbox.width / 2 + 10}, ${bbox.height + 20})`);
            } else {
                hideInfo();
            }
        }

    function hideInfo() {
    d3.select(".dialog").remove();
}

    svg.call(zoom);

    function reset() {
        paths.transition().style("fill", null);
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        );
        hideInfo(); // Ocultar el diálogo al hacer clic fuera de los polígonos
    }

    function clicked(event, d) {
        const [[x0, y0], [x1, y1]] = pathGenerator.bounds(d);
        event.stopPropagation();
        paths.transition().style("fill", null);
        d3.select(this).transition().style("fill", "red");
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg.node())
        );
        hideInfo(); // Ocultar el diálogo antes de mostrar la nueva información
        showInfo(d);
    }

    function zoomed(event) {
        const {transform} = event;
        g.attr("transform", transform);
        g.attr("stroke-width", 1 / transform.k);
    }

    d3.select("#refresh-button").on("click", () => {
        selectedCategory = "Población";
        selectedYear = "2020";
        d3.selectAll("#category-buttons button").classed("active", false);
        d3.selectAll("#year-buttons-container button").classed("active", false);
        d3.select("#category-buttons button[data-category='Población']").classed("active", true);
        d3.select("#year-buttons-container button[data-year='2020']").classed("active", true);
        updateMinMaxValues();
        updateMap();
        reset();
    });

    d3.select("#back-button").on("click", () => {
        window.location.href = 'index.html';
    });
});
