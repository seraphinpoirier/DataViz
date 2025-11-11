const colors = {
  primary: "#4a90e2",
  secondary: "#e74c3c",
  tertiary: "#2ecc71",
  quaternary: "#f39c12",
  quinary: "#9b59b6",
  heatmap: d3.scaleSequential(d3.interpolateYlOrRd),
};

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

let loadedData = {
  fatalities: null,
  civilianFatalities: null,
  eventsTargetingCivilians: null,
  demonstrationEvents: null,
};

function parseNum(d, key) {
  const val = +d[key];
  return isNaN(val) ? 0 : val;
}

function getRegion(name) {
  for (const [r, arr] of Object.entries(regionGroups)) {
    if (arr.some((c) => name.includes(c) || c.includes(name))) return r;
  }
  return "Other";
}

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

      createHistogram();
      createRidgelinePlot();
      createBoxPlot();
    }
  )
  .catch(() => {
    d3.select("body")
      .append("div")
      .style("padding", "20px")
      .style("color", "red")
      .html(
        "(1) Error loading data files. Please ensure all CSV files are available in the data folder."
      );
  });

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
    .attr("x", (d) => xScale(d.country))
    .attr("y", (d) => yScale(d.fatalities))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => height - yScale(d.fatalities))
    .attr("fill", colors.primary)
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
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.append("g").call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")));

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Fatalities");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text("Country");
}

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
    year,
    civilian: civilianByYear.get(year) || 0,
    total: totalByYear.get(year) || 0,
  }));

  data.forEach((d) => (d.combatant = d.total - d.civilian));

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
    .attr("x", (d) => xSubgroup(d.key))
    .attr("y", (d) => yScale(d.value))
    .attr("width", xSubgroup.bandwidth())
    .attr("height", (d) => height - yScale(d.value))
    .attr("fill", (d) => (d.key === "civilian" ? colors.secondary : colors.tertiary))
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

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));
  g.append("g").call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")));

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Casualties");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text("Year");

  const legend = g.append("g").attr("transform", `translate(${width + 20}, 20)`);

  subgroups.forEach((subgroup, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", subgroup === "civilian" ? colors.secondary : colors.tertiary);
    row.append("text").attr("x", 20).attr("y", 12).text(subgroup.charAt(0).toUpperCase() + subgroup.slice(1));
  });
}

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

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const regionYearData = {};
  Object.keys(regionGroups).forEach((region) => {
    regionYearData[region] = {};
    loadedData.eventsTargetingCivilians.forEach((d) => {
      if (regionGroups[region].some((c) => d.country.includes(c) || c.includes(d.country))) {
        regionYearData[region][d.year] = (regionYearData[region][d.year] || 0) + d.events;
      }
    });
  });

  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const regions = Object.keys(regionGroups);

  const maxValue = d3.max(regions, (region) => d3.max(years, (year) => regionYearData[region][year] || 0));
  const colorScale = colors.heatmap.domain([0, maxValue]);

  const xScale = d3.scaleBand().domain(years.map(String)).range([0, width]).padding(0.05);
  const yScale = d3.scaleBand().domain(regions).range([0, height]).padding(0.05);

  const tooltip = container.append("div").attr("class", "tooltip");

  regions.forEach((region) => {
    years.forEach((year) => {
      const value = regionYearData[region][year] || 0;

      const cell = g
        .append("rect")
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

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));
  g.append("g").call(d3.axisLeft(yScale));

  g.append("text").attr("x", width / 2).attr("y", height + 40).attr("text-anchor", "middle").text("Year");
  g.append("text").attr("transform", "rotate(-90)").attr("y", -70).attr("x", -height / 2).attr("text-anchor", "middle").text("Region");
}

function createStackedBarChart() {
  if (!loadedData.eventsTargetingCivilians || !loadedData.demonstrationEvents) return;

  const container = d3.select("#stacked-bar-chart");
  const margin = { top: 40, right: 180, bottom: 60, left: 80 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  container.html("");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const regionData = [];
  Object.keys(regionGroups).forEach((region) => {
    const countries = regionGroups[region];
    let targetingCivilians = 0;
    let demonstrations = 0;

    loadedData.eventsTargetingCivilians.forEach((d) => {
      if (countries.some((c) => d.country.includes(c) || c.includes(d.country))) {
        targetingCivilians += d.events;
      }
    });

    loadedData.demonstrationEvents.forEach((d) => {
      if (countries.some((c) => d.country.includes(c) || c.includes(d.country))) {
        demonstrations += d.events;
      }
    });

    let other = 0;
    loadedData.fatalities.forEach((d) => {
      if (countries.some((c) => d.country.includes(c) || c.includes(d.country))) {
        other += d.fatalities;
      }
    });

    other = Math.min(other / 100, targetingCivilians + demonstrations);

    regionData.push({
      region,
      targeting: targetingCivilians,
      demonstrations,
      other,
    });
  });

  const keys = ["targeting", "demonstrations", "other"];
  const keyLabels = {
    targeting: "Targeting Civilians",
    demonstrations: "Demonstrations",
    other: "Other Events",
  };

  const stackedData = regionData.map((d) => {
    const total = keys.reduce((s, k) => s + d[k], 0);
    const p = {};
    keys.forEach((k) => (p[k] = total > 0 ? (d[k] / total) * 100 : 0));
    p.region = d.region;
    return p;
  });

  const xScale = d3.scaleBand().domain(regionData.map((d) => d.region)).range([0, width]).padding(0.2);
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
    .attr("fill", (d) =>
      d.key === "targeting" ? colors.secondary : d.key === "demonstrations" ? colors.quinary : colors.quaternary
    )
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

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale)).selectAll("text")
    .attr("transform", "rotate(-15)")
    .style("text-anchor", "end");

  g.append("g").call(d3.axisLeft(yScale).tickFormat((d) => d + "%"));

  g.append("text").attr("transform", "rotate(-90)").attr("y", -50).attr("x", -height / 2).attr("text-anchor", "middle").text("Percentage");
  g.append("text").attr("x", width / 2).attr("y", height + 50).attr("text-anchor", "middle").text("Region");

  const legend = g.append("g").attr("transform", `translate(${width + 20}, 20)`);
  keys.forEach((key, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", key === "targeting" ? colors.secondary : key === "demonstrations" ? colors.quinary : colors.quaternary);
    row.append("text").attr("x", 20).attr("y", 12).text(keyLabels[key]);
  });
}

function createWaffleChart() {
  if (!loadedData.eventsTargetingCivilians || !loadedData.demonstrationEvents) return;

  const totalEvents = [
    { type: "Events targeting civilians", value: d3.sum(loadedData.eventsTargetingCivilians, (d) => d.events) },
    { type: "Demonstration events", value: d3.sum(loadedData.demonstrationEvents, (d) => d.events) },
  ];

  const total = d3.sum(totalEvents, (d) => d.value);
  const numSquares = 100;
  const squareSize = 20;
  const cols = 10;
  const rows = numSquares / cols;

  const waffleData = [];
  totalEvents.forEach((d) => {
    d.units = Math.round((d.value / total) * numSquares);
    for (let i = 0; i < d.units; i++) waffleData.push({ type: d.type });
  });

  const width = cols * squareSize;
  const height = rows * squareSize;

  const container = d3.select("#waffle-chart");
  container.html("");

  const svg = container.append("svg").attr("width", width).attr("height", height).style("font-family", "sans-serif");

  const color = d3.scaleOrdinal().domain(totalEvents.map((d) => d.type)).range(["#d1495b", "#edae49"]);

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
        `<div style="width:15px; height:15px; background:${color(d.type)}; margin-right:8px;"></div> ${d.type} (${d3.format(",")(d.value)})`
    );
}

function createHistogram() {
  if (!loadedData.fatalities) return;

  const container = d3.select("#histogram-chart");
  container.html("");

  const margin = { top: 30, right: 20, bottom: 50, left: 70 };
  const width = 960 - margin.left - margin.right;
  const height = 360 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const raw = loadedData.fatalities.map((d) => d.fatalities).filter((v) => v > 0);
  if (!raw.length) return;

  const max = d3.max(raw);

  const x = d3.scaleLog().domain([1, max]).range([0, width]).nice();
  const tickFormat = d3.format(".2s");

  const logVals = raw.map((v) => Math.log10(v));
  const logMin = 0;
  const logMax = Math.log10(max);
  const thresholds = d3.range(logMin, logMax, (logMax - logMin) / 30);
  const bins = d3.bin().domain([logMin, logMax]).thresholds(thresholds).value((v) => Math.log10(v))(raw);

  const y = d3.scaleLinear().domain([0, d3.max(bins, (d) => d.length) || 1]).nice().range([height, 0]);

  const tooltip = container.append("div").attr("class", "tooltip");

  g.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(Math.pow(10, d.x0)) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(Math.pow(10, d.x1)) - x(Math.pow(10, d.x0)) - 1))
    .attr("height", (d) => height - y(d.length))
    .attr("fill", colors.primary)
    .on("mousemove", (event, d) => {
      const lo = Math.round(Math.pow(10, d.x0));
      const hi = Math.round(Math.pow(10, d.x1));
      tooltip
        .classed("visible", true)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(`${tickFormat(lo)}–${tickFormat(hi)}<br>${d.length} records`);
    })
    .on("mouseout", () => tooltip.classed("visible", false));

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(6, "~s"));
  g.append("g").call(d3.axisLeft(y));

  g.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -50).attr("text-anchor", "middle").text("Count");
  g.append("text").attr("x", width / 2).attr("y", height + 40).attr("text-anchor", "middle").text("Yearly Fatalities");
}

function createRidgelinePlot() {
  if (!loadedData.fatalities) return;

  const container = d3.select("#violin-plot");
  container.html("");

  const toolbar = container.append("div").attr("class", "ridge-toolbar");
  toolbar.append("label").style("font-weight","700").text("Region:");
  const toggle = toolbar.append("div").attr("class", "toggle");
  const REGIONS = ["Africa","Middle East & Asia"];
  const btns = toggle.selectAll("button")
    .data(REGIONS)
    .enter()
    .append("button")
    .attr("type","button")
    .attr("class",(d,i)=> i===0 ? "active" : null)
    .text(d=>d);

  const allYears = Array.from(new Set(loadedData.fatalities.map(d=>+d.year)))
    .filter(y => y >= 2018 && y <= 2025)
    .sort((a,b)=>a-b);

  const margin = { top: 10, right: 24, bottom: 44, left: 100 };
  const bandH  = 36;
  const innerH = bandH * allYears.length + 10;

  const outerW = container.node().clientWidth || 960;
  const width  = Math.max(640, Math.min(960, outerW)) - margin.left - margin.right;
  const height = innerH;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio","xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const rowsLayer = g.append("g").attr("class","rows-layer");
  const xAxisG = g.append("g").attr("class","axis axis-x").attr("transform", `translate(0,${height})`);
  const yAxisG = g.append("g").attr("class","axis axis-y");
  g.append("text").attr("class","axis-label")
    .attr("x", width/2).attr("y", height+36).attr("text-anchor","middle")
    .text("Number of Fatalities");

  const yBand = d3.scaleBand().domain(allYears.map(String)).range([0, height]).paddingInner(0.55);

  yAxisG.call(d3.axisLeft(yBand).tickSizeOuter(0));

  const kernelEpanechnikov = k => v => Math.abs(v) <= 1 ? 0.75*(1 - v*v)/k : 0;
  const kde = (valuesLog, gridLog, bw=0.22) => {
    const K = kernelEpanechnikov(bw);
    return gridLog.map(t => [Math.pow(10,t), d3.mean(valuesLog, v => K((v - t)/bw)) || 0]);
  };

  function draw(region) {
    const inRegion = loadedData.fatalities.filter(d =>
      regionGroups[region].some(c => d.country.includes(c) || c.includes(d.country))
    );

    const maxX = d3.max(inRegion, d => d.fatalities) || 1;
    const x = d3.scaleLog().domain([1, Math.max(10, maxX)]).range([0, width]).nice();

    xAxisG.call(
      d3.axisBottom(x)
        .tickValues([1,10,100,1000,10000,100000,1000000].filter(v => v <= x.domain()[1]))
        .tickFormat(d3.format(".0s"))
    );
    xAxisG.raise(); yAxisG.raise();

    const lgMin = Math.log10(x.domain()[0]), lgMax = Math.log10(x.domain()[1]);
    const gridLog = d3.ticks(lgMin, lgMax, 180);

    const perYear = allYears.map(yr => {
      const vals = inRegion.filter(d => d.year === yr)
        .map(d => Math.max(1, +d.fatalities));
      const logs = vals.map(v => Math.log10(v));
      const dens = logs.length ? kde(logs, gridLog) : gridLog.map(t => [Math.pow(10,t), 0]);
      return { year: String(yr), density: dens, n: vals.length };
    });

    const peak = d3.max(perYear, y => d3.max(y.density, d => d[1])) || 1e-6;

    const rows = rowsLayer.selectAll(".ridge-row").data(perYear, d => d.year);
    rows.exit().remove();

    const enter = rows.enter().append("g").attr("class","ridge-row");
    enter.append("rect")
      .attr("x",0).attr("height", yBand.bandwidth())
      .attr("rx",6).attr("ry",6)
      .attr("fill","rgba(0,0,0,0.03)").attr("stroke","none");
    enter.append("path")
      .attr("class","ridgeline")
      .attr("stroke","#222").attr("stroke-width",0.6).attr("opacity",0.95);

    const merged = enter.merge(rows).attr("transform", d => `translate(0, ${yBand(d.year)})`);
    merged.select("rect").attr("width", width);

    merged.select("path.ridgeline")
      .each(function(d){
        const half = Math.min(yBand.bandwidth() * 0.42, 24);   
        const scaleY = half / peak;
        const area = d3.area()
          .curve(d3.curveCatmullRom.alpha(0.6))
          .x(p => x(p[0]))
          .y0(half)
          .y1(p => half - p[1] * scaleY);
        d3.select(this)
          .attr("fill", d3.interpolateWarm((+d.year - allYears[0]) / (allYears[allYears.length-1] - allYears[0] || 1)))
          .attr("d", area(d.density));
      });

    xAxisG.raise(); yAxisG.raise();  
  }

  draw(REGIONS[0]);
  btns.on("click", function(_, region){
    btns.classed("active", d => d === region);
    draw(region);
  });
}


function createBoxPlot() {
  if (!loadedData.fatalities) return;

  const container = d3.select("#box-plot");
  container.html("");

  const margin = { top: 30, right: 20, bottom: 50, left: 80 };
  const width = 960 - margin.left - margin.right;
  const height = 360 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const dataByYear = d3.group(loadedData.fatalities, (d) => d.year);
  const years = [...dataByYear.keys()].filter((y) => y >= 2018 && y <= 2024).sort((a, b) => a - b);

  const allVals = [...loadedData.fatalities.map((d) => d.fatalities)].filter((v) => v > 0);
  if (!allVals.length) return;

  const y = d3.scaleLog().domain([1, d3.max(allVals)]).range([height, 0]).nice();
  const x = d3.scaleBand().domain(years).range([0, width]).padding(0.4);
  const boxWidth = Math.min(40, x.bandwidth());

  years.forEach((year) => {
    const vals = dataByYear.get(year).map((d) => d.fatalities).filter((v) => v > 0).sort(d3.ascending);
    if (!vals.length) return;

    const q1 = d3.quantile(vals, 0.25) || 1;
    const med = d3.quantile(vals, 0.5) || 1;
    const q3 = d3.quantile(vals, 0.75) || 1;
    const iqr = q3 - q1;

    const min = vals.find((v) => v >= q1 - 1.5 * iqr) ?? vals[0];
    const max = [...vals].reverse().find((v) => v <= q3 + 1.5 * iqr) ?? vals[vals.length - 1];

    const cx = x(year) + x.bandwidth() / 2;

    g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", y(min)).attr("y2", y(max)).attr("stroke", "#555");

    g.append("rect")
      .attr("x", cx - boxWidth / 2)
      .attr("y", y(q3))
      .attr("width", boxWidth)
      .attr("height", Math.max(1, y(q1) - y(q3)))
      .attr("fill", colors.tertiary)
      .attr("opacity", 0.8);

    g.append("line").attr("x1", cx - boxWidth / 2).attr("x2", cx + boxWidth / 2).attr("y1", y(med)).attr("y2", y(med)).attr("stroke", "#333");

    g.append("line").attr("x1", cx - boxWidth / 2).attr("x2", cx + boxWidth / 2).attr("y1", y(min)).attr("y2", y(min)).attr("stroke", "#555");
    g.append("line").attr("x1", cx - boxWidth / 2).attr("x2", cx + boxWidth / 2).attr("y1", y(max)).attr("y2", y(max)).attr("stroke", "#555");
  });

  g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  g.append("g").call(d3.axisLeft(y).ticks(6, "~s"));

  g.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -60).attr("text-anchor", "middle").text("Fatalities per year");
  g.append("text").attr("x", width / 2).attr("y", height + 40).attr("text-anchor", "middle").text("Year");
}
