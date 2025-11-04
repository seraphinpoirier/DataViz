// Color scales
const colors = {
  primary: "#4a90e2",
  secondary: "#e74c3c",
  tertiary: "#2ecc71",
  quaternary: "#f39c12",
  quinary: "#9b59b6",
  heatmap: d3.scaleSequential(d3.interpolateYlOrRd),
};

// Data storage
let loadedData = {
  fatalities: null,
  civilianFatalities: null,
  eventsTargetingCivilians: null,
  demonstrationEvents: null,
};

// Helper function to parse numeric values
function parseNum(d, key) {
  const val = +d[key];
  return isNaN(val) ? 0 : val;
}

// Load all CSV data files
Promise.all([
  d3.csv(
    "data/number_of_reported_fatalities_by_country-year_as-of-24Oct2025_0.csv",
    (d) => ({
      country: d.COUNTRY,
      year: +d.YEAR,
      fatalities: parseNum(d, "FATALITIES"),
    })
  ),
  d3.csv(
    "data/number_of_reported_civilian_fatalities_by_country-year_as-of-24Oct2025_0.csv",
    (d) => ({
      country: d.COUNTRY,
      year: +d.YEAR,
      fatalities: parseNum(d, "FATALITIES"),
    })
  ),
  d3.csv(
    "data/number_of_events_targeting_civilians_by_country-year_as-of-24Oct2025_0.csv",
    (d) => ({
      country: d.COUNTRY,
      year: +d.YEAR,
      events: parseNum(d, "EVENTS"),
    })
  ),
  d3.csv(
    "data/number_of_demonstration_events_by_country-year_as-of-24Oct2025_0.csv",
    (d) => ({
      country: d.COUNTRY,
      year: +d.YEAR,
      events: parseNum(d, "EVENTS"),
    })
  ),
])
  .then(
    ([
      fatalities,
      civilianFatalities,
      eventsTargetingCivilians,
      demonstrationEvents,
    ]) => {
      loadedData.fatalities = fatalities;
      loadedData.civilianFatalities = civilianFatalities;
      loadedData.eventsTargetingCivilians = eventsTargetingCivilians;
      loadedData.demonstrationEvents = demonstrationEvents;

      createBarChart();
      createGroupedBarChart();
      createHeatmap();
      createStackedBarChart();
      createWaffleChart();
    }
  )
  .catch((error) => {
    console.error("Error loading data:", error);
    d3.select("body")
      .append("div")
      .style("padding", "20px")
      .style("color", "red")
      .html(
        "(1) Error loading data files. Please ensure all CSV files are available in the data folder."
      );
  });

// 1. Bar Chart - Top countries by total fatalities
function createBarChart() {
  if (!loadedData.fatalities) return;

  const container = d3.select("#bar-chart");
  const margin = { top: 40, right: 30, bottom: 60, left: 80 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  container.html("");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const countryTotals = d3.rollup(
    loadedData.fatalities,
    (v) => d3.sum(v, (d) => d.fatalities),
    (d) => d.country
  );

  const data = Array.from(countryTotals, ([country, fatalities]) => ({
    country,
    fatalities,
  }))
    .sort((a, b) => b.fatalities - a.fatalities)
    .slice(0, 10);

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.country))
    .range([0, width])
    .padding(0.2);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.fatalities)])
    .nice()
    .range([height, 0]);

  const tooltip = container.append("div").attr("class", "tooltip");

  g.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => xScale(d.country))
    .attr("y", (d) => yScale(d.fatalities))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => height - yScale(d.fatalities))
    .on("mouseover", function (event, d) {
      tooltip
        .classed("visible", true)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(`${d.country}<br>Fatalities: ${d.fatalities.toLocaleString()}`);
    })
    .on("mouseout", function () {
      tooltip.classed("visible", false);
    });

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")));

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Fatalities");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text("Country");
}

// 2. Grouped Bar Chart - Civilian vs Total Fatalities by Year
function createGroupedBarChart() {
  if (!loadedData.fatalities || !loadedData.civilianFatalities) return;

  const container = d3.select("#grouped-bar-chart");
  const margin = { top: 40, right: 180, bottom: 60, left: 80 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  container.html("");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const totalByYear = d3.rollup(
    loadedData.fatalities,
    (v) => d3.sum(v, (d) => d.fatalities),
    (d) => d.year
  );

  const civilianByYear = d3.rollup(
    loadedData.civilianFatalities,
    (v) => d3.sum(v, (d) => d.fatalities),
    (d) => d.year
  );

  const years = Array.from(
    new Set([...totalByYear.keys(), ...civilianByYear.keys()])
  )
    .filter((y) => y >= 2018 && y <= 2024)
    .sort();

  const data = years.map((year) => ({
    year: year,
    civilian: civilianByYear.get(year) || 0,
    total: totalByYear.get(year) || 0,
  }));

  data.forEach((d) => {
    d.combatant = d.total - d.civilian;
  });

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.year))
    .range([0, width])
    .padding(0.2);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.civilian, d.combatant))])
    .nice()
    .range([height, 0]);

  const subgroups = ["civilian", "combatant"];
  const xSubgroup = d3
    .scaleBand()
    .domain(subgroups)
    .range([0, xScale.bandwidth()])
    .padding(0.1);

  const tooltip = container.append("div").attr("class", "tooltip");

  g.selectAll("g.group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "group")
    .attr("transform", (d) => `translate(${xScale(d.year)},0)`)
    .selectAll("rect")
    .data((d) => subgroups.map((key) => ({ key, value: d[key], year: d.year })))
    .enter()
    .append("rect")
    .attr("class", (d) => `bar-group-${d.key === "civilian" ? 2 : 1}`)
    .attr("x", (d) => xSubgroup(d.key))
    .attr("y", (d) => yScale(d.value))
    .attr("width", xSubgroup.bandwidth())
    .attr("height", (d) => height - yScale(d.value))
    .on("mouseover", function (event, d) {
      tooltip
        .classed("visible", true)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(`Year: ${d.year}<br>${d.key}: ${d.value.toLocaleString()}`);
    })
    .on("mouseout", function () {
      tooltip.classed("visible", false);
    });

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")));

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Casualties");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text("Year");

  const legend = g
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width + 20}, 20)`);

  subgroups.forEach((subgroup, i) => {
    const legendRow = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow
      .append("rect")
      .attr("class", `bar-group-${subgroup === "civilian" ? 2 : 1}`)
      .attr("width", 15)
      .attr("height", 15);

    legendRow
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(subgroup.charAt(0).toUpperCase() + subgroup.slice(1));
  });
}

// 3. Heatmap - Events targeting civilians by year and month (aggregated)
function createHeatmap() {
  if (!loadedData.eventsTargetingCivilians) return;

  const container = d3.select("#heatmap");
  const margin = { top: 60, right: 30, bottom: 60, left: 100 };
  const width = 900 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  container.html("");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const regionGroups = {
    "Middle East & Asia": [
      "Afghanistan",
      "Iraq",
      "Syria",
      "Yemen",
      "Pakistan",
      "Israel",
      "Palestine",
    ],
    Africa: [
      "Nigeria",
      "Somalia",
      "Democratic Republic of the Congo",
      "Ethiopia",
      "Mali",
      "Burkina Faso",
    ],
    Europe: ["Ukraine", "Russia", "Azerbaijan", "Armenia"],
    Americas: ["Colombia", "Mexico", "Haiti", "Venezuela"],
  };

  const regionYearData = {};
  Object.keys(regionGroups).forEach((region) => {
    regionYearData[region] = {};
    loadedData.eventsTargetingCivilians.forEach((d) => {
      if (
        regionGroups[region].some(
          (country) =>
            d.country.includes(country) || country.includes(d.country)
        )
      ) {
        regionYearData[region][d.year] =
          (regionYearData[region][d.year] || 0) + d.events;
      }
    });
  });

  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const regions = Object.keys(regionGroups);

  const maxValue = d3.max(regions, (region) =>
    d3.max(years, (year) => regionYearData[region][year] || 0)
  );
  const colorScale = colors.heatmap.domain([0, maxValue]);

  const xScale = d3
    .scaleBand()
    .domain(years.map(String))
    .range([0, width])
    .padding(0.05);

  const yScale = d3
    .scaleBand()
    .domain(regions)
    .range([0, height])
    .padding(0.05);

  const tooltip = container.append("div").attr("class", "tooltip");

  regions.forEach((region) => {
    years.forEach((year) => {
      const value = regionYearData[region][year] || 0;
      const cell = g
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", xScale(String(year)))
        .attr("y", yScale(region))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .on("mouseover", function (event) {
          tooltip
            .classed("visible", true)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px")
            .html(`${region}<br>${year}: ${value.toLocaleString()} events`);
        })
        .on("mouseout", function () {
          tooltip.classed("visible", false);
        });

      cell.style("fill", colorScale(value));

      if (value > 0) {
        g.append("text")
          .attr("class", "axis")
          .attr("x", xScale(String(year)) + xScale.bandwidth() / 2)
          .attr("y", yScale(region) + yScale.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", value > maxValue / 2 ? "white" : "black")
          .attr("font-size", "11px")
          .text(value > 1000 ? d3.format(".1s")(value) : value);
      }
    });
  });

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  g.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -70)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Region");
}

// 4. 100% Stacked Bar Chart - Event types by region
function createStackedBarChart() {
  if (!loadedData.eventsTargetingCivilians || !loadedData.demonstrationEvents)
    return;

  const container = d3.select("#stacked-bar-chart");
  const margin = { top: 40, right: 180, bottom: 60, left: 80 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  container.html("");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const regionGroups = {
    "Middle East & Asia": [
      "Afghanistan",
      "Iraq",
      "Syria",
      "Yemen",
      "Pakistan",
      "Israel",
      "Palestine",
    ],
    Africa: [
      "Nigeria",
      "Somalia",
      "Democratic Republic of the Congo",
      "Ethiopia",
      "Mali",
      "Burkina Faso",
    ],
    Europe: ["Ukraine", "Russia", "Azerbaijan", "Armenia"],
    Americas: ["Colombia", "Mexico", "Haiti", "Venezuela"],
  };

  const regionData = [];
  Object.keys(regionGroups).forEach((region) => {
    const countries = regionGroups[region];
    let targetingCivilians = 0;
    let demonstrations = 0;

    loadedData.eventsTargetingCivilians.forEach((d) => {
      if (
        countries.some((c) => d.country.includes(c) || c.includes(d.country))
      ) {
        targetingCivilians += d.events;
      }
    });

    loadedData.demonstrationEvents.forEach((d) => {
      if (
        countries.some((c) => d.country.includes(c) || c.includes(d.country))
      ) {
        demonstrations += d.events;
      }
    });

    let other = 0;
    loadedData.fatalities.forEach((d) => {
      if (
        countries.some((c) => d.country.includes(c) || c.includes(d.country))
      ) {
        other += d.fatalities;
      }
    });

    other = Math.min(other / 100, targetingCivilians + demonstrations);

    regionData.push({
      region: region,
      targeting: targetingCivilians,
      demonstrations: demonstrations,
      other: other,
    });
  });

  const keys = ["targeting", "demonstrations", "other"];
  const keyLabels = {
    targeting: "Targeting Civilians",
    demonstrations: "Demonstrations",
    other: "Other Events",
  };

  const stackedData = regionData.map((d) => {
    const total = keys.reduce((sum, key) => sum + d[key], 0);
    const percentages = {};
    keys.forEach((key) => {
      percentages[key] = total > 0 ? (d[key] / total) * 100 : 0;
    });
    percentages.region = d.region;
    return percentages;
  });

  const xScale = d3
    .scaleBand()
    .domain(regionData.map((d) => d.region))
    .range([0, width])
    .padding(0.2);

  const yScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);

  const tooltip = container.append("div").attr("class", "tooltip");

  const stack = d3.stack().keys(keys);

  const series = stack(stackedData);

  g.selectAll("g.series")
    .data(series)
    .enter()
    .append("g")
    .attr("class", (d) => `series category-${d.key}`)
    .selectAll("rect")
    .data((d) => d.map((item) => ({ ...item, key: d.key })))
    .enter()
    .append("rect")
    .attr("class", (d) => `stacked-bar category-${d.key}`)
    .attr("x", (d) => xScale(d.data.region))
    .attr("y", (d) => yScale(d[1]))
    .attr("height", (d) => yScale(d[0]) - yScale(d[1]))
    .attr("width", xScale.bandwidth())
    .on("mouseover", function (event, d) {
      const value = (d[1] - d[0]).toFixed(1);
      tooltip
        .classed("visible", true)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(`${d.data.region}<br>${keyLabels[d.key]}: ${value}%`);
    })
    .on("mouseout", function () {
      tooltip.classed("visible", false);
    });

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-15)")
    .style("text-anchor", "end");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).tickFormat((d) => d + "%"));

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Percentage");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text("Region");

  const legend = g
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width + 20}, 20)`);

  keys.forEach((key, i) => {
    const legendRow = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow
      .append("rect")
      .attr("class", `category-${key}`)
      .attr("width", 15)
      .attr("height", 15);

    legendRow.append("text").attr("x", 20).attr("y", 12).text(keyLabels[key]);
  });
}

// 5. Waffle Chart - Distribution of event types
function createWaffleChart() {
  if (!loadedData.eventsTargetingCivilians || !loadedData.demonstrationEvents)
    return;

  const totalEvents = [
    {
      type: "Events targeting civilians",
      value: d3.sum(loadedData.eventsTargetingCivilians, (d) => d.events),
    },
    {
      type: "Demonstration events",
      value: d3.sum(loadedData.demonstrationEvents, (d) => d.events),
    },
  ];

  const total = d3.sum(totalEvents, (d) => d.value);

  const numSquares = 100;
  const squareSize = 20;
  const cols = 10;
  const rows = numSquares / cols;

  const waffleData = [];
  totalEvents.forEach((d) => {
    d.units = Math.round((d.value / total) * numSquares);
    for (let i = 0; i < d.units; i++) {
      waffleData.push({ type: d.type });
    }
  });

  const width = cols * squareSize;
  const height = rows * squareSize;

  const container = d3.select("#waffle-chart");
  container.html("");

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("font-family", "sans-serif");

  const color = d3
    .scaleOrdinal()
    .domain(totalEvents.map((d) => d.type))
    .range(["#d1495b", "#edae49"]);

  svg
    .selectAll("rect")
    .data(waffleData)
    .enter()
    .append("rect")
    .attr("x", (_, i) => (i % cols) * squareSize)
    .attr("y", (_, i) => Math.floor(i / cols) * squareSize)
    .attr("width", squareSize - 2)
    .attr("height", squareSize - 2)
    .attr("fill", (d) => color(d.type));

  const legend = container.append("div").style("margin-top", "10px");

  legend
    .selectAll(".legend-item")
    .data(totalEvents)
    .enter()
    .append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "5px")
    .html(
      (d) =>
        `<div style="width:15px; height:15px; background:${color(
          d.type
        )}; margin-right:8px;"></div> ${d.type} (${d3.format(",")(d.value)})`
    );
}

