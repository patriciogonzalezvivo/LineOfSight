# Author: Patricio Gonzalez Vivo - 2015 (@patriciogv)
import json, os
from SatData import getDataFromLTEsFolder, getDataFromIDFolder, makeJsons

os.system("./getAll.sh")

folder = './all'
data, types = getDataFromLTEsFolder(folder)
makeJsons(folder, data, types)

folder = './curated'
data, types = getDataFromIDFolder(data, folder)
makeJsons(folder, data, types)