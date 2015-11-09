#!/bin/bash

if [ !-d satellites]: then
	mkdir satellites
fi
cd satellites
wget -q http://www.celestrak.com/NORAD/elements/amateur.txt
wget -q http://www.celestrak.com/NORAD/elements/argos.txt
wget -q http://www.celestrak.com/NORAD/elements/beidou.txt
wget -q http://www.celestrak.com/NORAD/elements/cubesat.txt
wget -q http://www.celestrak.com/NORAD/elements/dmc.txt
wget -q http://www.celestrak.com/NORAD/elements/education.txt
wget -q http://www.celestrak.com/NORAD/elements/engineering.txt
wget -q http://www.celestrak.com/NORAD/elements/galileo.txt
wget -q http://www.celestrak.com/NORAD/elements/geo.txt
wget -q http://www.celestrak.com/NORAD/elements/geodetic.txt
wget -q http://www.celestrak.com/NORAD/elements/glo-ops.txt
wget -q http://www.celestrak.com/NORAD/elements/globalstar.txt
wget -q http://www.celestrak.com/NORAD/elements/goes.txt
wget -q http://www.celestrak.com/NORAD/elements/gorizont.txt
wget -q http://www.celestrak.com/NORAD/elements/gps-ops.txt
wget -q http://www.celestrak.com/NORAD/elements/intelsat.txt
wget -q http://www.celestrak.com/NORAD/elements/iridium.txt
wget -q http://www.celestrak.com/NORAD/elements/military.txt
wget -q http://www.celestrak.com/NORAD/elements/molniya.txt
wget -q http://www.celestrak.com/NORAD/elements/musson.txt
wget -q http://www.celestrak.com/NORAD/elements/nnss.txt
wget -q http://www.celestrak.com/NORAD/elements/noaa.txt
wget -q http://www.celestrak.com/NORAD/elements/orbcomm.txt
wget -q http://www.celestrak.com/NORAD/elements/other.txt
wget -q http://www.celestrak.com/NORAD/elements/other-comm.txt
wget -q http://www.celestrak.com/NORAD/elements/radar.txt
wget -q http://www.celestrak.com/NORAD/elements/raduga.txt
wget -q http://www.celestrak.com/NORAD/elements/resource.txt
wget -q http://www.celestrak.com/NORAD/elements/sarsat.txt
wget -q http://www.celestrak.com/NORAD/elements/sbas.txt
wget -q http://www.celestrak.com/NORAD/elements/science.txt
wget -q http://www.celestrak.com/NORAD/elements/stations.txt
wget -q http://www.celestrak.com/NORAD/elements/tdrss.txt
wget -q http://www.celestrak.com/NORAD/elements/tle-new.txt
wget -q http://www.celestrak.com/NORAD/elements/visual.txt
wget -q http://www.celestrak.com/NORAD/elements/weather.txt
wget -q http://www.celestrak.com/NORAD/elements/x-comm.txt
wget -q http://www.celestrak.com/NORAD/elements/1999-025.txt
wget -q http://www.celestrak.com/NORAD/elements/cosmos-2251-debris.txt
wget -q http://www.celestrak.com/NORAD/elements/2012-044.txt