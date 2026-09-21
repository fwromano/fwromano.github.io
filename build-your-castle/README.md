# Build Your Castle

Static, browser-only off-grid resource planner for Bastrop, Texas.

Open https://fwromano.github.io/build-your-castle/ or serve this folder with a local HTTP server. No build, package installation, API key or backend is required.

Adjust house, EV, greenhouse, catchment, solar, battery and hydrogen inputs. Simulate loss of one energy path or one tank, replay the NASA POWER 2001–2020 daily rainfall record, copy scenario URLs and export JSON.

This is an early feasibility calculator, not an engineering specification. Energy uses annual/monthly estimates; water uses daily rain with constant demand. Full formulas, sources and limits appear in the page. Greenhouse and atmospheric water production inputs are assumptions. The detailed prior hourly energy study is not rerun by this app.

## Rain data

rain.json contains [YYYYMMDD, rainfall_inches] pairs from NASA POWER PRECTOTCORR at latitude 30.11, longitude -97.315, January 2001–December 2020, converted from mm to inches.

Source request: https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=RE&longitude=-97.315&latitude=30.11&start=20010101&end=20201231&format=JSON

Inputs exported/shared by a user may be visible to recipients. There are no analytics or third-party runtime dependencies.
