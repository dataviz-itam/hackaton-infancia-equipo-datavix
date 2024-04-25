//mapa antes de agregar zoom, jala al centavo 12.03 am

// Variables para mantener el estado de los filtros
let selectedCategory = "Población"; // Valor predeterminado
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

    let minValue, maxValue;
    const updateMinMaxValues = () => {
        const key = `${selectedCategory} ${selectedYear}`;
        [minValue, maxValue] = d3.extent(csvData, d => parseFloat(d[key]));
    };

    const colorScale = d3.scaleSequential(d3.interpolateBlues);

    const paths = svg.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", pathGenerator)
        .attr("class", "mapa");

    const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

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

        // Actualizar el cuadro de información al cambiar el año
        const selectedMunicipality = d3.select('.mapa.highlighted').data()[0];
        if (selectedMunicipality) {
            showInfo(selectedMunicipality);
        } else {
            hideInfo();
        }
    }

    updateMinMaxValues();
    updateMap();

    paths.on("mouseover", function(event, d) {
        const cve_mun = d.properties.CVE_MUN;
        d3.selectAll(".mapa").classed("highlighted", false);
        d3.selectAll("#municipality-list li").classed("highlighted", false);
        d3.select(this).classed("highlighted", true);
        d3.select(`#municipality-list li[data-cve="${cve_mun}"]`).classed('highlighted', true);
        showMunicipalityName(d.properties.Municipio || d.properties.NOMGEO, event);
    }).on("mouseout", function() {
        d3.selectAll(".mapa").classed("highlighted", false);
        d3.selectAll("#municipality-list li").classed("highlighted", false);
        hideMunicipalityName();
    }).on("click", function(event, d) {
        showInfo(d);
    });

    const listContainer = d3.select('#municipality-list ul');
    
    listContainer.selectAll('li')
    .data(csvData)
    .enter()
    .append('li')
    .attr('data-cve', d => d.CVE_MUN)
    .text(d => d.Municipio)
    .on('mouseover', function(event, d) {
        const cve_mun = d.CVE_MUN;
        d3.selectAll(".mapa").classed("highlighted", false);
        d3.selectAll("#municipality-list li").classed("highlighted", false);
        paths.filter(p => p.properties.CVE_MUN === cve_mun).classed('highlighted', true);
        d3.select(this).classed('highlighted', true);
        showMunicipalityName(d.Municipio, event);
    })
    .on('mouseout', function() {
        d3.selectAll(".mapa").classed("highlighted", false);
        d3.selectAll("#municipality-list li").classed("highlighted", false);
        hideMunicipalityName();
    })
    .on('click', function(event, d) {
        const cve_mun = d.CVE_MUN;
        const munData = dataMap.get(cve_mun);
        if (munData) {
            showInfo({ properties: { CVE_MUN: cve_mun, Municipio: munData.Municipio } });
        } else {
            hideInfo();
        }
        paths.filter(p => p.properties.CVE_MUN === cve_mun).classed('highlighted', true);
        d3.select(this).classed('highlighted', true);
    });

    const categoryButtons = [
        "Población",
        "Población en situación de pobreza",
        "Población con ingreso inferior a la línea de pobreza por ingresos",
        "Población con carencia por rezago educativo",
        "Población con carencia por acceso a los servicios de salud",
        "Población con carencia por acceso a la seguridad social",
        "Población con carencia por calidad y espacios de la vivienda",
        "Población con carencia por acceso a los servicios básicos en la vivienda",
        "Población con carencia por acceso a la alimentación"
    ];

    const categoryButtonsContainer = d3.select("#category-buttons");

    categoryButtonsContainer
        .selectAll("button")
        .data(categoryButtons)
        .enter()
        .append("button")
        .text(d => d)
        .attr("data-category", d => d)
        .on("click", function() {
            selectedCategory = d3.select(this).attr("data-category");
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
            const isPopulation = selectedCategory === "Población";
            const formattedValue = isPopulation ? value : `${value}%`;
            const info = `${selectedCategory} en ${munData.Municipio} (${selectedYear}): ${formattedValue}`;
            d3.select("#info").html(info).classed('visible', true);
        } else {
            hideInfo();
        }
    }

    function hideInfo() {
        d3.select("#info").classed('visible', false);
    }

    function showMunicipalityName(name, event) {
        tooltip.html(name)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("opacity", 1);
    }
    
    function hideMunicipalityName() {
        tooltip.style("opacity", 0);
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
    });

    d3.select("#back-button").on("click", () => {
        window.location.href = 'principal.html';
    });
});