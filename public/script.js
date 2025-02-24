async function getData(url) {
  try {
    const request = await fetch(url);
    const json = await request.json();
    return json;
  } catch (err) {
    console.error(err);
  }
}

function addMarker(jsonElement, icon, map) {
  let lat = Number(jsonElement.latitude);
  let long = Number(jsonElement.longitude);
  const marker = L.marker([lat, long], { icon: icon });
  marker.addTo(map);
}

// https://data.princegeorgescountymd.gov/resource/9tsa-iner.json?%24limit=1500
async function mainEvent() {
  const url = "https://data.princegeorgescountymd.gov/resource/9tsa-iner.json";
  const litterData = await getData(url);
  console.log(litterData);

  // const target = document.querySelector("#branches");
  // map of litter collection locations
  const map = L.map("map").setView([38.7849, -76.89], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  let trashIcon = L.icon({
    iconUrl:
      "https://cdn.glitch.me/2cb619b4-e7c8-4bf7-bf9f-57ebf2791979/blue-bag.png?v=1729645743247",
    shadowUrl:
      "https://cdn.glitch.me/2cb619b4-e7c8-4bf7-bf9f-57ebf2791979/blue-bag-shadow.png?v=1729647572946",

    iconSize: [40, 40], // size of the icon
    shadowSize: [40, 40], // size of the shadow
    iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
    shadowAnchor: [19, 99], // the same for the shadow
    popupAnchor: [-3, -76], // point from which the popup should open relative to the iconAnchor
  });

  // adds marker for each location
  litterData.map((item) => addMarker(item, trashIcon, map));

  // sets up watershed object
  const watersheds = [
    "Anacostia River",
    "Western Branch",
    "Potomac River",
    "Piscataway Creek",
    "Patuxent River",
    "Oxon Creek",
    "Mattawoman Creek",
    "Zekiah Swamp",
  ];
  const watershedTotal = {};
  for (const watershed of watersheds) {
    watershedTotal[watershed] = 0;
  }

  // finds all orgs and dates
  const allOrgs = [];
  const allDates = [];
  for (const item of litterData) {
    // const date = new Date(item.creationdate);
    const selectDay = item.creationdate.substring(0, 10);
    allDates.push(selectDay);
    allOrgs.push(item.organization);
  }

  // find distinct dates
  let uniqueDates = [...new Set(allDates)];
  // sets up district object
  const districts = [];
  const districtSum = {};
  for (const day of uniqueDates) {
    districtSum[day] = 0;
  }
  for (let i = 0; i < 9; i++) {
    // within each district, create a new object for dates
    const datesTotal = {};
    for (const day of uniqueDates) {
      datesTotal[day] = 0;
    }
    districts[i] = datesTotal;
  }
  uniqueDates.forEach((element) => new Date(element));
  // console.log(uniqueDates)

  // find distinct organizations
  const uniqueOrgs = [...new Set(allOrgs)];
  // sets organization object
  const orgsTotal = {};
  for (const org of uniqueOrgs) {
    orgsTotal[org] = 0;
  }

  for (const item of litterData) {
    // group together entries that mention Patuxent River
    if (
      item.major_wshed === "Patuxent River lower" ||
      item.major_wshed === "Patuxent River middle" ||
      item.major_wshed === "Patuxent River upper"
    ) {
      item.major_wshed = "Patuxent River";
    }
    // group together  entries that mention Potomac River
    if (
      item.major_wshed === "Potomac River M tidal" ||
      item.major_wshed === "Potomac River U tidal"
    ) {
      item.major_wshed = "Potomac River";
    }

    // get total number of litter bags for each watershed
    item.total_bags_litter = Number(item.total_bags_litter);
    if (!isNaN(item.total_bags_litter)) {
      watershedTotal[item.major_wshed] += item.total_bags_litter;
    }

    // get total number of litter collections for each organization
    orgsTotal[item.organization] += 1;

    // get total number of litter collections on each day for each district
    item.council_district = Number(item.council_district);
    const index = item.council_district - 1;
    const sub = item["creationdate"].substring(0, 10);
    districts[index][sub] += 1;
    districtSum[sub]++;
  }
  // console.log(districtSum)

  Chart.defaults.font.family = "Krub";
  Chart.defaults.color = "#000";
  Chart.defaults.size = 16;
  // make bar chart of bags of litter in watersheds
  const waterImg = new Image();
  waterImg.src =
    "https://cdn.glitch.global/2cb619b4-e7c8-4bf7-bf9f-57ebf2791979/water.jpeg?v=1729703045245";
  waterImg.onload = () => {
    const bar = document.querySelector("#barChart").getContext("2d");
    const fillPattern = bar.createPattern(waterImg, "repeat");
    const x = new Chart(bar, {
      data: {
        datasets: [
          {
            type: "bar",
            label: "Total bags of trash",
            data: watershedTotal,
            backgroundColor: fillPattern,
          },
        ],
      },
      options: {
        indexAxis: "y",
        scales: {
          x: {
            // beginAtZero: true,
            title: {
              display: true,
              text: "Total bags of trash",
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
        // layout: {
        //   padding: {
        //     left: 20,
        //     right: 35,
        //     bottom: 10,
        //     top: 10,
        //   },
        // },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: "How much trash ends up in the watersheds?",
            font: {
              size: 20,
            },
          },
        },
      },
    });
  };

  // make donoughnut chart from organization data
  const donut = document.querySelector("#doughnut");
  new Chart(donut, {
    type: "doughnut",
    data: {
      labels: [
        "RH Hilarios Landscaping",
        "Community Bridge",
        "Express Business",
        "Department of Public Works & Transportation",
      ],
      datasets: [
        {
          label: "Litter Collections",
          data: Object.values(orgsTotal),
          backgroundColor: ["rgb(60,179,113)", "#A1FFC0", "#CDD370", "#40E0D0"],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Who are behind these efforts?",
          font: {
            size: 20,
          },
        },
      },
    },
  });

  //   const footer = (tooltipItems) => {
  //   let sum = 0;

  //   tooltipItems.forEach(function(tooltipItem) {
  //     sum += tooltipItem.parsed.y;
  //   });
  //   return 'Sum: ' + sum;
  // };

  // make line chart of litter collections per day
  const line = document.querySelector("#line");
  new Chart(line, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Total cleanup events",
          data: Object.values(districtSum),
          borderColor: "#1e90ff",
        },
      ],
      labels: uniqueDates,
    },
    options: {
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: "Total cleanup events",
          },
        },
        x: {
          type: "timeseries",
          title: {
            display: true,
            text: "Selected dates in 2022",
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        filler: {
          propagate: false,
        },
        "samples-filler-analyser": {
          target: "chart-analyser",
        },
        legend: {
          display: false,
          position: "bottom",
          align: "start",
        },
        title: {
          display: true,
          text: "How often is litter collected?",
          font: {
            size: 20,
          },
        },
        subtitle: {
          display: true,
          text: "Cleanup events time series",
          font: {
            size: 16,
          },
        },
        // tooltip: {
        //   callbacks: {
        //     footer: footer,
        //   }
        // }
      },
      interaction: {
        intersect: false,
        // mode: 'index',
      },
    },
  });
}
document.addEventListener("DOMContentLoaded", async () => mainEvent());
