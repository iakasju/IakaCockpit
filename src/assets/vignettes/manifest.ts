/**
 * manifest.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN.
 *
 * Mapping (charte-app -> team -> roleIndex 0..7 -> URL d'asset Vite servie en 'self').
 * L'ordre des roleIndex reflete teams.json (0=portefeuille, 1=coordination,
 * 2=cadrage, 3=dev, 4=qualite, 5=production, 6=design, 7=doc).
 * Teams : toutes celles de teams.json + pseudo-team 'iakaframe' (casting natif).
 * Source: chartes=[naonedge/dark naonedge/light grimoire/dark-fantasy os/windows os/ubuntu os/android os/macos cartoon/std photoreal/modern studio/clair].
 */
import v0 from "./naonedge-dark/autobots/optimus.png";
import v1 from "./naonedge-dark/autobots/bumblebee.png";
import v2 from "./naonedge-dark/autobots/ratchet.png";
import v3 from "./naonedge-dark/autobots/wheeljack.png";
import v4 from "./naonedge-dark/autobots/hound.png";
import v5 from "./naonedge-dark/autobots/ironhide.png";
import v6 from "./naonedge-dark/autobots/jazz.png";
import v7 from "./naonedge-dark/autobots/blaster.png";
import v8 from "./naonedge-dark/avengers/nickfury.png";
import v9 from "./naonedge-dark/avengers/capamerica.png";
import v10 from "./naonedge-dark/avengers/strange.png";
import v11 from "./naonedge-dark/avengers/ironman.png";
import v12 from "./naonedge-dark/avengers/hawkeye.png";
import v13 from "./naonedge-dark/avengers/thor.png";
import v14 from "./naonedge-dark/avengers/lokiavg.png";
import v15 from "./naonedge-dark/avengers/spiderman.png";
import v16 from "./naonedge-dark/dc-justice/superman.png";
import v17 from "./naonedge-dark/dc-justice/batman.png";
import v18 from "./naonedge-dark/dc-justice/wonderwoman.png";
import v19 from "./naonedge-dark/dc-justice/cyborg.png";
import v20 from "./naonedge-dark/dc-justice/greenlantern.png";
import v21 from "./naonedge-dark/dc-justice/aquaman.png";
import v22 from "./naonedge-dark/dc-justice/flash.png";
import v23 from "./naonedge-dark/dc-justice/manhunter.png";
import v24 from "./naonedge-dark/defenders/daredevil.png";
import v25 from "./naonedge-dark/defenders/lukecage.png";
import v26 from "./naonedge-dark/defenders/jessicajones.png";
import v27 from "./naonedge-dark/defenders/ironfist.png";
import v28 from "./naonedge-dark/defenders/punisher.png";
import v29 from "./naonedge-dark/defenders/kingpin.png";
import v30 from "./naonedge-dark/defenders/elektra.png";
import v31 from "./naonedge-dark/defenders/foggynelson.png";
import v32 from "./naonedge-dark/harry-potter/dumbledore.png";
import v33 from "./naonedge-dark/harry-potter/harry.png";
import v34 from "./naonedge-dark/harry-potter/mcgonagall.png";
import v35 from "./naonedge-dark/harry-potter/hagrid.png";
import v36 from "./naonedge-dark/harry-potter/hermione.png";
import v37 from "./naonedge-dark/harry-potter/snape.png";
import v38 from "./naonedge-dark/harry-potter/luna.png";
import v39 from "./naonedge-dark/harry-potter/ron.png";
import v40 from "./naonedge-dark/lotr/galadriel.png";
import v41 from "./naonedge-dark/lotr/aragorn.png";
import v42 from "./naonedge-dark/lotr/gandalf.png";
import v43 from "./naonedge-dark/lotr/gimli.png";
import v44 from "./naonedge-dark/lotr/legolas.png";
import v45 from "./naonedge-dark/lotr/boromir.png";
import v46 from "./naonedge-dark/lotr/bilbo.png";
import v47 from "./naonedge-dark/lotr/frodo.png";
import v48 from "./naonedge-dark/norse/odin.png";
import v49 from "./naonedge-dark/norse/thornorse.png";
import v50 from "./naonedge-dark/norse/mimir.png";
import v51 from "./naonedge-dark/norse/brokkr.png";
import v52 from "./naonedge-dark/norse/heimdall.png";
import v53 from "./naonedge-dark/norse/tyr.png";
import v54 from "./naonedge-dark/norse/loki.png";
import v55 from "./naonedge-dark/norse/bragi.png";
import v56 from "./naonedge-dark/olympians/zeus.png";
import v57 from "./naonedge-dark/olympians/ares.png";
import v58 from "./naonedge-dark/olympians/athena.png";
import v59 from "./naonedge-dark/olympians/hephaestus.png";
import v60 from "./naonedge-dark/olympians/apollo.png";
import v61 from "./naonedge-dark/olympians/hades.png";
import v62 from "./naonedge-dark/olympians/dionysus.png";
import v63 from "./naonedge-dark/olympians/hermes.png";
import v64 from "./naonedge-dark/rebels/leia.png";
import v65 from "./naonedge-dark/rebels/hansolo.png";
import v66 from "./naonedge-dark/rebels/obiwan.png";
import v67 from "./naonedge-dark/rebels/luke.png";
import v68 from "./naonedge-dark/rebels/chewbacca.png";
import v69 from "./naonedge-dark/rebels/lando.png";
import v70 from "./naonedge-dark/rebels/c3po.png";
import v71 from "./naonedge-dark/rebels/r2d2.png";
import v72 from "./naonedge-dark/starfleet/picard.png";
import v73 from "./naonedge-dark/starfleet/riker.png";
import v74 from "./naonedge-dark/starfleet/data.png";
import v75 from "./naonedge-dark/starfleet/geordi.png";
import v76 from "./naonedge-dark/starfleet/worf.png";
import v77 from "./naonedge-dark/starfleet/crusher.png";
import v78 from "./naonedge-dark/starfleet/troi.png";
import v79 from "./naonedge-dark/starfleet/wesley.png";
import v80 from "./naonedge-dark/xmen/profx.png";
import v81 from "./naonedge-dark/xmen/cyclops.png";
import v82 from "./naonedge-dark/xmen/beast.png";
import v83 from "./naonedge-dark/xmen/forge.png";
import v84 from "./naonedge-dark/xmen/wolverine.png";
import v85 from "./naonedge-dark/xmen/colossus.png";
import v86 from "./naonedge-dark/xmen/mystique.png";
import v87 from "./naonedge-dark/xmen/nightcrawler.png";
import v88 from "./naonedge-dark/iakaframe/odin.png";
import v89 from "./naonedge-dark/iakaframe/aragorn.png";
import v90 from "./naonedge-dark/iakaframe/gandalf.png";
import v91 from "./naonedge-dark/iakaframe/gimli.png";
import v92 from "./naonedge-dark/iakaframe/legolas.png";
import v93 from "./naonedge-dark/iakaframe/helm.png";
import v94 from "./naonedge-dark/iakaframe/loki.png";
import v95 from "./naonedge-dark/iakaframe/nathalie.png";
import v96 from "./naonedge-light/autobots/optimus.png";
import v97 from "./naonedge-light/autobots/bumblebee.png";
import v98 from "./naonedge-light/autobots/ratchet.png";
import v99 from "./naonedge-light/autobots/wheeljack.png";
import v100 from "./naonedge-light/autobots/hound.png";
import v101 from "./naonedge-light/autobots/ironhide.png";
import v102 from "./naonedge-light/autobots/jazz.png";
import v103 from "./naonedge-light/autobots/blaster.png";
import v104 from "./naonedge-light/avengers/nickfury.png";
import v105 from "./naonedge-light/avengers/capamerica.png";
import v106 from "./naonedge-light/avengers/strange.png";
import v107 from "./naonedge-light/avengers/ironman.png";
import v108 from "./naonedge-light/avengers/hawkeye.png";
import v109 from "./naonedge-light/avengers/thor.png";
import v110 from "./naonedge-light/avengers/lokiavg.png";
import v111 from "./naonedge-light/avengers/spiderman.png";
import v112 from "./naonedge-light/dc-justice/superman.png";
import v113 from "./naonedge-light/dc-justice/batman.png";
import v114 from "./naonedge-light/dc-justice/wonderwoman.png";
import v115 from "./naonedge-light/dc-justice/cyborg.png";
import v116 from "./naonedge-light/dc-justice/greenlantern.png";
import v117 from "./naonedge-light/dc-justice/aquaman.png";
import v118 from "./naonedge-light/dc-justice/flash.png";
import v119 from "./naonedge-light/dc-justice/manhunter.png";
import v120 from "./naonedge-light/defenders/daredevil.png";
import v121 from "./naonedge-light/defenders/lukecage.png";
import v122 from "./naonedge-light/defenders/jessicajones.png";
import v123 from "./naonedge-light/defenders/ironfist.png";
import v124 from "./naonedge-light/defenders/punisher.png";
import v125 from "./naonedge-light/defenders/kingpin.png";
import v126 from "./naonedge-light/defenders/elektra.png";
import v127 from "./naonedge-light/defenders/foggynelson.png";
import v128 from "./naonedge-light/harry-potter/dumbledore.png";
import v129 from "./naonedge-light/harry-potter/harry.png";
import v130 from "./naonedge-light/harry-potter/mcgonagall.png";
import v131 from "./naonedge-light/harry-potter/hagrid.png";
import v132 from "./naonedge-light/harry-potter/hermione.png";
import v133 from "./naonedge-light/harry-potter/snape.png";
import v134 from "./naonedge-light/harry-potter/luna.png";
import v135 from "./naonedge-light/harry-potter/ron.png";
import v136 from "./naonedge-light/lotr/galadriel.png";
import v137 from "./naonedge-light/lotr/aragorn.png";
import v138 from "./naonedge-light/lotr/gandalf.png";
import v139 from "./naonedge-light/lotr/gimli.png";
import v140 from "./naonedge-light/lotr/legolas.png";
import v141 from "./naonedge-light/lotr/boromir.png";
import v142 from "./naonedge-light/lotr/bilbo.png";
import v143 from "./naonedge-light/lotr/frodo.png";
import v144 from "./naonedge-light/norse/odin.png";
import v145 from "./naonedge-light/norse/thornorse.png";
import v146 from "./naonedge-light/norse/mimir.png";
import v147 from "./naonedge-light/norse/brokkr.png";
import v148 from "./naonedge-light/norse/heimdall.png";
import v149 from "./naonedge-light/norse/tyr.png";
import v150 from "./naonedge-light/norse/loki.png";
import v151 from "./naonedge-light/norse/bragi.png";
import v152 from "./naonedge-light/olympians/zeus.png";
import v153 from "./naonedge-light/olympians/ares.png";
import v154 from "./naonedge-light/olympians/athena.png";
import v155 from "./naonedge-light/olympians/hephaestus.png";
import v156 from "./naonedge-light/olympians/apollo.png";
import v157 from "./naonedge-light/olympians/hades.png";
import v158 from "./naonedge-light/olympians/dionysus.png";
import v159 from "./naonedge-light/olympians/hermes.png";
import v160 from "./naonedge-light/rebels/leia.png";
import v161 from "./naonedge-light/rebels/hansolo.png";
import v162 from "./naonedge-light/rebels/obiwan.png";
import v163 from "./naonedge-light/rebels/luke.png";
import v164 from "./naonedge-light/rebels/chewbacca.png";
import v165 from "./naonedge-light/rebels/lando.png";
import v166 from "./naonedge-light/rebels/c3po.png";
import v167 from "./naonedge-light/rebels/r2d2.png";
import v168 from "./naonedge-light/starfleet/picard.png";
import v169 from "./naonedge-light/starfleet/riker.png";
import v170 from "./naonedge-light/starfleet/data.png";
import v171 from "./naonedge-light/starfleet/geordi.png";
import v172 from "./naonedge-light/starfleet/worf.png";
import v173 from "./naonedge-light/starfleet/crusher.png";
import v174 from "./naonedge-light/starfleet/troi.png";
import v175 from "./naonedge-light/starfleet/wesley.png";
import v176 from "./naonedge-light/xmen/profx.png";
import v177 from "./naonedge-light/xmen/cyclops.png";
import v178 from "./naonedge-light/xmen/beast.png";
import v179 from "./naonedge-light/xmen/forge.png";
import v180 from "./naonedge-light/xmen/wolverine.png";
import v181 from "./naonedge-light/xmen/colossus.png";
import v182 from "./naonedge-light/xmen/mystique.png";
import v183 from "./naonedge-light/xmen/nightcrawler.png";
import v184 from "./naonedge-light/iakaframe/odin.png";
import v185 from "./naonedge-light/iakaframe/aragorn.png";
import v186 from "./naonedge-light/iakaframe/gandalf.png";
import v187 from "./naonedge-light/iakaframe/gimli.png";
import v188 from "./naonedge-light/iakaframe/legolas.png";
import v189 from "./naonedge-light/iakaframe/helm.png";
import v190 from "./naonedge-light/iakaframe/loki.png";
import v191 from "./naonedge-light/iakaframe/nathalie.png";
import v192 from "./grimoire-dark-fantasy/autobots/optimus.png";
import v193 from "./grimoire-dark-fantasy/autobots/bumblebee.png";
import v194 from "./grimoire-dark-fantasy/autobots/ratchet.png";
import v195 from "./grimoire-dark-fantasy/autobots/wheeljack.png";
import v196 from "./grimoire-dark-fantasy/autobots/hound.png";
import v197 from "./grimoire-dark-fantasy/autobots/ironhide.png";
import v198 from "./grimoire-dark-fantasy/autobots/jazz.png";
import v199 from "./grimoire-dark-fantasy/autobots/blaster.png";
import v200 from "./grimoire-dark-fantasy/avengers/nickfury.png";
import v201 from "./grimoire-dark-fantasy/avengers/capamerica.png";
import v202 from "./grimoire-dark-fantasy/avengers/strange.png";
import v203 from "./grimoire-dark-fantasy/avengers/ironman.png";
import v204 from "./grimoire-dark-fantasy/avengers/hawkeye.png";
import v205 from "./grimoire-dark-fantasy/avengers/thor.png";
import v206 from "./grimoire-dark-fantasy/avengers/lokiavg.png";
import v207 from "./grimoire-dark-fantasy/avengers/spiderman.png";
import v208 from "./grimoire-dark-fantasy/dc-justice/superman.png";
import v209 from "./grimoire-dark-fantasy/dc-justice/batman.png";
import v210 from "./grimoire-dark-fantasy/dc-justice/wonderwoman.png";
import v211 from "./grimoire-dark-fantasy/dc-justice/cyborg.png";
import v212 from "./grimoire-dark-fantasy/dc-justice/greenlantern.png";
import v213 from "./grimoire-dark-fantasy/dc-justice/aquaman.png";
import v214 from "./grimoire-dark-fantasy/dc-justice/flash.png";
import v215 from "./grimoire-dark-fantasy/dc-justice/manhunter.png";
import v216 from "./grimoire-dark-fantasy/defenders/daredevil.png";
import v217 from "./grimoire-dark-fantasy/defenders/lukecage.png";
import v218 from "./grimoire-dark-fantasy/defenders/jessicajones.png";
import v219 from "./grimoire-dark-fantasy/defenders/ironfist.png";
import v220 from "./grimoire-dark-fantasy/defenders/punisher.png";
import v221 from "./grimoire-dark-fantasy/defenders/kingpin.png";
import v222 from "./grimoire-dark-fantasy/defenders/elektra.png";
import v223 from "./grimoire-dark-fantasy/defenders/foggynelson.png";
import v224 from "./grimoire-dark-fantasy/harry-potter/dumbledore.png";
import v225 from "./grimoire-dark-fantasy/harry-potter/harry.png";
import v226 from "./grimoire-dark-fantasy/harry-potter/mcgonagall.png";
import v227 from "./grimoire-dark-fantasy/harry-potter/hagrid.png";
import v228 from "./grimoire-dark-fantasy/harry-potter/hermione.png";
import v229 from "./grimoire-dark-fantasy/harry-potter/snape.png";
import v230 from "./grimoire-dark-fantasy/harry-potter/luna.png";
import v231 from "./grimoire-dark-fantasy/harry-potter/ron.png";
import v232 from "./grimoire-dark-fantasy/lotr/galadriel.png";
import v233 from "./grimoire-dark-fantasy/lotr/aragorn.png";
import v234 from "./grimoire-dark-fantasy/lotr/gandalf.png";
import v235 from "./grimoire-dark-fantasy/lotr/gimli.png";
import v236 from "./grimoire-dark-fantasy/lotr/legolas.png";
import v237 from "./grimoire-dark-fantasy/lotr/boromir.png";
import v238 from "./grimoire-dark-fantasy/lotr/bilbo.png";
import v239 from "./grimoire-dark-fantasy/lotr/frodo.png";
import v240 from "./grimoire-dark-fantasy/norse/odin.png";
import v241 from "./grimoire-dark-fantasy/norse/thornorse.png";
import v242 from "./grimoire-dark-fantasy/norse/mimir.png";
import v243 from "./grimoire-dark-fantasy/norse/brokkr.png";
import v244 from "./grimoire-dark-fantasy/norse/heimdall.png";
import v245 from "./grimoire-dark-fantasy/norse/tyr.png";
import v246 from "./grimoire-dark-fantasy/norse/loki.png";
import v247 from "./grimoire-dark-fantasy/norse/bragi.png";
import v248 from "./grimoire-dark-fantasy/olympians/zeus.png";
import v249 from "./grimoire-dark-fantasy/olympians/ares.png";
import v250 from "./grimoire-dark-fantasy/olympians/athena.png";
import v251 from "./grimoire-dark-fantasy/olympians/hephaestus.png";
import v252 from "./grimoire-dark-fantasy/olympians/apollo.png";
import v253 from "./grimoire-dark-fantasy/olympians/hades.png";
import v254 from "./grimoire-dark-fantasy/olympians/dionysus.png";
import v255 from "./grimoire-dark-fantasy/olympians/hermes.png";
import v256 from "./grimoire-dark-fantasy/rebels/leia.png";
import v257 from "./grimoire-dark-fantasy/rebels/hansolo.png";
import v258 from "./grimoire-dark-fantasy/rebels/obiwan.png";
import v259 from "./grimoire-dark-fantasy/rebels/luke.png";
import v260 from "./grimoire-dark-fantasy/rebels/chewbacca.png";
import v261 from "./grimoire-dark-fantasy/rebels/lando.png";
import v262 from "./grimoire-dark-fantasy/rebels/c3po.png";
import v263 from "./grimoire-dark-fantasy/rebels/r2d2.png";
import v264 from "./grimoire-dark-fantasy/starfleet/picard.png";
import v265 from "./grimoire-dark-fantasy/starfleet/riker.png";
import v266 from "./grimoire-dark-fantasy/starfleet/data.png";
import v267 from "./grimoire-dark-fantasy/starfleet/geordi.png";
import v268 from "./grimoire-dark-fantasy/starfleet/worf.png";
import v269 from "./grimoire-dark-fantasy/starfleet/crusher.png";
import v270 from "./grimoire-dark-fantasy/starfleet/troi.png";
import v271 from "./grimoire-dark-fantasy/starfleet/wesley.png";
import v272 from "./grimoire-dark-fantasy/xmen/profx.png";
import v273 from "./grimoire-dark-fantasy/xmen/cyclops.png";
import v274 from "./grimoire-dark-fantasy/xmen/beast.png";
import v275 from "./grimoire-dark-fantasy/xmen/forge.png";
import v276 from "./grimoire-dark-fantasy/xmen/wolverine.png";
import v277 from "./grimoire-dark-fantasy/xmen/colossus.png";
import v278 from "./grimoire-dark-fantasy/xmen/mystique.png";
import v279 from "./grimoire-dark-fantasy/xmen/nightcrawler.png";
import v280 from "./grimoire-dark-fantasy/iakaframe/odin.png";
import v281 from "./grimoire-dark-fantasy/iakaframe/aragorn.png";
import v282 from "./grimoire-dark-fantasy/iakaframe/gandalf.png";
import v283 from "./grimoire-dark-fantasy/iakaframe/gimli.png";
import v284 from "./grimoire-dark-fantasy/iakaframe/legolas.png";
import v285 from "./grimoire-dark-fantasy/iakaframe/helm.png";
import v286 from "./grimoire-dark-fantasy/iakaframe/loki.png";
import v287 from "./grimoire-dark-fantasy/iakaframe/nathalie.png";
import v288 from "./os-windows/autobots/optimus.png";
import v289 from "./os-windows/autobots/bumblebee.png";
import v290 from "./os-windows/autobots/ratchet.png";
import v291 from "./os-windows/autobots/wheeljack.png";
import v292 from "./os-windows/autobots/hound.png";
import v293 from "./os-windows/autobots/ironhide.png";
import v294 from "./os-windows/autobots/jazz.png";
import v295 from "./os-windows/autobots/blaster.png";
import v296 from "./os-windows/avengers/nickfury.png";
import v297 from "./os-windows/avengers/capamerica.png";
import v298 from "./os-windows/avengers/strange.png";
import v299 from "./os-windows/avengers/ironman.png";
import v300 from "./os-windows/avengers/hawkeye.png";
import v301 from "./os-windows/avengers/thor.png";
import v302 from "./os-windows/avengers/lokiavg.png";
import v303 from "./os-windows/avengers/spiderman.png";
import v304 from "./os-windows/dc-justice/superman.png";
import v305 from "./os-windows/dc-justice/batman.png";
import v306 from "./os-windows/dc-justice/wonderwoman.png";
import v307 from "./os-windows/dc-justice/cyborg.png";
import v308 from "./os-windows/dc-justice/greenlantern.png";
import v309 from "./os-windows/dc-justice/aquaman.png";
import v310 from "./os-windows/dc-justice/flash.png";
import v311 from "./os-windows/dc-justice/manhunter.png";
import v312 from "./os-windows/defenders/daredevil.png";
import v313 from "./os-windows/defenders/lukecage.png";
import v314 from "./os-windows/defenders/jessicajones.png";
import v315 from "./os-windows/defenders/ironfist.png";
import v316 from "./os-windows/defenders/punisher.png";
import v317 from "./os-windows/defenders/kingpin.png";
import v318 from "./os-windows/defenders/elektra.png";
import v319 from "./os-windows/defenders/foggynelson.png";
import v320 from "./os-windows/harry-potter/dumbledore.png";
import v321 from "./os-windows/harry-potter/harry.png";
import v322 from "./os-windows/harry-potter/mcgonagall.png";
import v323 from "./os-windows/harry-potter/hagrid.png";
import v324 from "./os-windows/harry-potter/hermione.png";
import v325 from "./os-windows/harry-potter/snape.png";
import v326 from "./os-windows/harry-potter/luna.png";
import v327 from "./os-windows/harry-potter/ron.png";
import v328 from "./os-windows/lotr/galadriel.png";
import v329 from "./os-windows/lotr/aragorn.png";
import v330 from "./os-windows/lotr/gandalf.png";
import v331 from "./os-windows/lotr/gimli.png";
import v332 from "./os-windows/lotr/legolas.png";
import v333 from "./os-windows/lotr/boromir.png";
import v334 from "./os-windows/lotr/bilbo.png";
import v335 from "./os-windows/lotr/frodo.png";
import v336 from "./os-windows/norse/odin.png";
import v337 from "./os-windows/norse/thornorse.png";
import v338 from "./os-windows/norse/mimir.png";
import v339 from "./os-windows/norse/brokkr.png";
import v340 from "./os-windows/norse/heimdall.png";
import v341 from "./os-windows/norse/tyr.png";
import v342 from "./os-windows/norse/loki.png";
import v343 from "./os-windows/norse/bragi.png";
import v344 from "./os-windows/olympians/zeus.png";
import v345 from "./os-windows/olympians/ares.png";
import v346 from "./os-windows/olympians/athena.png";
import v347 from "./os-windows/olympians/hephaestus.png";
import v348 from "./os-windows/olympians/apollo.png";
import v349 from "./os-windows/olympians/hades.png";
import v350 from "./os-windows/olympians/dionysus.png";
import v351 from "./os-windows/olympians/hermes.png";
import v352 from "./os-windows/rebels/leia.png";
import v353 from "./os-windows/rebels/hansolo.png";
import v354 from "./os-windows/rebels/obiwan.png";
import v355 from "./os-windows/rebels/luke.png";
import v356 from "./os-windows/rebels/chewbacca.png";
import v357 from "./os-windows/rebels/lando.png";
import v358 from "./os-windows/rebels/c3po.png";
import v359 from "./os-windows/rebels/r2d2.png";
import v360 from "./os-windows/starfleet/picard.png";
import v361 from "./os-windows/starfleet/riker.png";
import v362 from "./os-windows/starfleet/data.png";
import v363 from "./os-windows/starfleet/geordi.png";
import v364 from "./os-windows/starfleet/worf.png";
import v365 from "./os-windows/starfleet/crusher.png";
import v366 from "./os-windows/starfleet/troi.png";
import v367 from "./os-windows/starfleet/wesley.png";
import v368 from "./os-windows/xmen/profx.png";
import v369 from "./os-windows/xmen/cyclops.png";
import v370 from "./os-windows/xmen/beast.png";
import v371 from "./os-windows/xmen/forge.png";
import v372 from "./os-windows/xmen/wolverine.png";
import v373 from "./os-windows/xmen/colossus.png";
import v374 from "./os-windows/xmen/mystique.png";
import v375 from "./os-windows/xmen/nightcrawler.png";
import v376 from "./os-windows/iakaframe/odin.png";
import v377 from "./os-windows/iakaframe/aragorn.png";
import v378 from "./os-windows/iakaframe/gandalf.png";
import v379 from "./os-windows/iakaframe/gimli.png";
import v380 from "./os-windows/iakaframe/legolas.png";
import v381 from "./os-windows/iakaframe/helm.png";
import v382 from "./os-windows/iakaframe/loki.png";
import v383 from "./os-windows/iakaframe/nathalie.png";
import v384 from "./os-ubuntu/autobots/optimus.png";
import v385 from "./os-ubuntu/autobots/bumblebee.png";
import v386 from "./os-ubuntu/autobots/ratchet.png";
import v387 from "./os-ubuntu/autobots/wheeljack.png";
import v388 from "./os-ubuntu/autobots/hound.png";
import v389 from "./os-ubuntu/autobots/ironhide.png";
import v390 from "./os-ubuntu/autobots/jazz.png";
import v391 from "./os-ubuntu/autobots/blaster.png";
import v392 from "./os-ubuntu/avengers/nickfury.png";
import v393 from "./os-ubuntu/avengers/capamerica.png";
import v394 from "./os-ubuntu/avengers/strange.png";
import v395 from "./os-ubuntu/avengers/ironman.png";
import v396 from "./os-ubuntu/avengers/hawkeye.png";
import v397 from "./os-ubuntu/avengers/thor.png";
import v398 from "./os-ubuntu/avengers/lokiavg.png";
import v399 from "./os-ubuntu/avengers/spiderman.png";
import v400 from "./os-ubuntu/dc-justice/superman.png";
import v401 from "./os-ubuntu/dc-justice/batman.png";
import v402 from "./os-ubuntu/dc-justice/wonderwoman.png";
import v403 from "./os-ubuntu/dc-justice/cyborg.png";
import v404 from "./os-ubuntu/dc-justice/greenlantern.png";
import v405 from "./os-ubuntu/dc-justice/aquaman.png";
import v406 from "./os-ubuntu/dc-justice/flash.png";
import v407 from "./os-ubuntu/dc-justice/manhunter.png";
import v408 from "./os-ubuntu/defenders/daredevil.png";
import v409 from "./os-ubuntu/defenders/lukecage.png";
import v410 from "./os-ubuntu/defenders/jessicajones.png";
import v411 from "./os-ubuntu/defenders/ironfist.png";
import v412 from "./os-ubuntu/defenders/punisher.png";
import v413 from "./os-ubuntu/defenders/kingpin.png";
import v414 from "./os-ubuntu/defenders/elektra.png";
import v415 from "./os-ubuntu/defenders/foggynelson.png";
import v416 from "./os-ubuntu/harry-potter/dumbledore.png";
import v417 from "./os-ubuntu/harry-potter/harry.png";
import v418 from "./os-ubuntu/harry-potter/mcgonagall.png";
import v419 from "./os-ubuntu/harry-potter/hagrid.png";
import v420 from "./os-ubuntu/harry-potter/hermione.png";
import v421 from "./os-ubuntu/harry-potter/snape.png";
import v422 from "./os-ubuntu/harry-potter/luna.png";
import v423 from "./os-ubuntu/harry-potter/ron.png";
import v424 from "./os-ubuntu/lotr/galadriel.png";
import v425 from "./os-ubuntu/lotr/aragorn.png";
import v426 from "./os-ubuntu/lotr/gandalf.png";
import v427 from "./os-ubuntu/lotr/gimli.png";
import v428 from "./os-ubuntu/lotr/legolas.png";
import v429 from "./os-ubuntu/lotr/boromir.png";
import v430 from "./os-ubuntu/lotr/bilbo.png";
import v431 from "./os-ubuntu/lotr/frodo.png";
import v432 from "./os-ubuntu/norse/odin.png";
import v433 from "./os-ubuntu/norse/thornorse.png";
import v434 from "./os-ubuntu/norse/mimir.png";
import v435 from "./os-ubuntu/norse/brokkr.png";
import v436 from "./os-ubuntu/norse/heimdall.png";
import v437 from "./os-ubuntu/norse/tyr.png";
import v438 from "./os-ubuntu/norse/loki.png";
import v439 from "./os-ubuntu/norse/bragi.png";
import v440 from "./os-ubuntu/olympians/zeus.png";
import v441 from "./os-ubuntu/olympians/ares.png";
import v442 from "./os-ubuntu/olympians/athena.png";
import v443 from "./os-ubuntu/olympians/hephaestus.png";
import v444 from "./os-ubuntu/olympians/apollo.png";
import v445 from "./os-ubuntu/olympians/hades.png";
import v446 from "./os-ubuntu/olympians/dionysus.png";
import v447 from "./os-ubuntu/olympians/hermes.png";
import v448 from "./os-ubuntu/rebels/leia.png";
import v449 from "./os-ubuntu/rebels/hansolo.png";
import v450 from "./os-ubuntu/rebels/obiwan.png";
import v451 from "./os-ubuntu/rebels/luke.png";
import v452 from "./os-ubuntu/rebels/chewbacca.png";
import v453 from "./os-ubuntu/rebels/lando.png";
import v454 from "./os-ubuntu/rebels/c3po.png";
import v455 from "./os-ubuntu/rebels/r2d2.png";
import v456 from "./os-ubuntu/starfleet/picard.png";
import v457 from "./os-ubuntu/starfleet/riker.png";
import v458 from "./os-ubuntu/starfleet/data.png";
import v459 from "./os-ubuntu/starfleet/geordi.png";
import v460 from "./os-ubuntu/starfleet/worf.png";
import v461 from "./os-ubuntu/starfleet/crusher.png";
import v462 from "./os-ubuntu/starfleet/troi.png";
import v463 from "./os-ubuntu/starfleet/wesley.png";
import v464 from "./os-ubuntu/xmen/profx.png";
import v465 from "./os-ubuntu/xmen/cyclops.png";
import v466 from "./os-ubuntu/xmen/beast.png";
import v467 from "./os-ubuntu/xmen/forge.png";
import v468 from "./os-ubuntu/xmen/wolverine.png";
import v469 from "./os-ubuntu/xmen/colossus.png";
import v470 from "./os-ubuntu/xmen/mystique.png";
import v471 from "./os-ubuntu/xmen/nightcrawler.png";
import v472 from "./os-ubuntu/iakaframe/odin.png";
import v473 from "./os-ubuntu/iakaframe/aragorn.png";
import v474 from "./os-ubuntu/iakaframe/gandalf.png";
import v475 from "./os-ubuntu/iakaframe/gimli.png";
import v476 from "./os-ubuntu/iakaframe/legolas.png";
import v477 from "./os-ubuntu/iakaframe/helm.png";
import v478 from "./os-ubuntu/iakaframe/loki.png";
import v479 from "./os-ubuntu/iakaframe/nathalie.png";
import v480 from "./os-android/autobots/optimus.png";
import v481 from "./os-android/autobots/bumblebee.png";
import v482 from "./os-android/autobots/ratchet.png";
import v483 from "./os-android/autobots/wheeljack.png";
import v484 from "./os-android/autobots/hound.png";
import v485 from "./os-android/autobots/ironhide.png";
import v486 from "./os-android/autobots/jazz.png";
import v487 from "./os-android/autobots/blaster.png";
import v488 from "./os-android/avengers/nickfury.png";
import v489 from "./os-android/avengers/capamerica.png";
import v490 from "./os-android/avengers/strange.png";
import v491 from "./os-android/avengers/ironman.png";
import v492 from "./os-android/avengers/hawkeye.png";
import v493 from "./os-android/avengers/thor.png";
import v494 from "./os-android/avengers/lokiavg.png";
import v495 from "./os-android/avengers/spiderman.png";
import v496 from "./os-android/dc-justice/superman.png";
import v497 from "./os-android/dc-justice/batman.png";
import v498 from "./os-android/dc-justice/wonderwoman.png";
import v499 from "./os-android/dc-justice/cyborg.png";
import v500 from "./os-android/dc-justice/greenlantern.png";
import v501 from "./os-android/dc-justice/aquaman.png";
import v502 from "./os-android/dc-justice/flash.png";
import v503 from "./os-android/dc-justice/manhunter.png";
import v504 from "./os-android/defenders/daredevil.png";
import v505 from "./os-android/defenders/lukecage.png";
import v506 from "./os-android/defenders/jessicajones.png";
import v507 from "./os-android/defenders/ironfist.png";
import v508 from "./os-android/defenders/punisher.png";
import v509 from "./os-android/defenders/kingpin.png";
import v510 from "./os-android/defenders/elektra.png";
import v511 from "./os-android/defenders/foggynelson.png";
import v512 from "./os-android/harry-potter/dumbledore.png";
import v513 from "./os-android/harry-potter/harry.png";
import v514 from "./os-android/harry-potter/mcgonagall.png";
import v515 from "./os-android/harry-potter/hagrid.png";
import v516 from "./os-android/harry-potter/hermione.png";
import v517 from "./os-android/harry-potter/snape.png";
import v518 from "./os-android/harry-potter/luna.png";
import v519 from "./os-android/harry-potter/ron.png";
import v520 from "./os-android/lotr/galadriel.png";
import v521 from "./os-android/lotr/aragorn.png";
import v522 from "./os-android/lotr/gandalf.png";
import v523 from "./os-android/lotr/gimli.png";
import v524 from "./os-android/lotr/legolas.png";
import v525 from "./os-android/lotr/boromir.png";
import v526 from "./os-android/lotr/bilbo.png";
import v527 from "./os-android/lotr/frodo.png";
import v528 from "./os-android/norse/odin.png";
import v529 from "./os-android/norse/thornorse.png";
import v530 from "./os-android/norse/mimir.png";
import v531 from "./os-android/norse/brokkr.png";
import v532 from "./os-android/norse/heimdall.png";
import v533 from "./os-android/norse/tyr.png";
import v534 from "./os-android/norse/loki.png";
import v535 from "./os-android/norse/bragi.png";
import v536 from "./os-android/olympians/zeus.png";
import v537 from "./os-android/olympians/ares.png";
import v538 from "./os-android/olympians/athena.png";
import v539 from "./os-android/olympians/hephaestus.png";
import v540 from "./os-android/olympians/apollo.png";
import v541 from "./os-android/olympians/hades.png";
import v542 from "./os-android/olympians/dionysus.png";
import v543 from "./os-android/olympians/hermes.png";
import v544 from "./os-android/rebels/leia.png";
import v545 from "./os-android/rebels/hansolo.png";
import v546 from "./os-android/rebels/obiwan.png";
import v547 from "./os-android/rebels/luke.png";
import v548 from "./os-android/rebels/chewbacca.png";
import v549 from "./os-android/rebels/lando.png";
import v550 from "./os-android/rebels/c3po.png";
import v551 from "./os-android/rebels/r2d2.png";
import v552 from "./os-android/starfleet/picard.png";
import v553 from "./os-android/starfleet/riker.png";
import v554 from "./os-android/starfleet/data.png";
import v555 from "./os-android/starfleet/geordi.png";
import v556 from "./os-android/starfleet/worf.png";
import v557 from "./os-android/starfleet/crusher.png";
import v558 from "./os-android/starfleet/troi.png";
import v559 from "./os-android/starfleet/wesley.png";
import v560 from "./os-android/xmen/profx.png";
import v561 from "./os-android/xmen/cyclops.png";
import v562 from "./os-android/xmen/beast.png";
import v563 from "./os-android/xmen/forge.png";
import v564 from "./os-android/xmen/wolverine.png";
import v565 from "./os-android/xmen/colossus.png";
import v566 from "./os-android/xmen/mystique.png";
import v567 from "./os-android/xmen/nightcrawler.png";
import v568 from "./os-android/iakaframe/odin.png";
import v569 from "./os-android/iakaframe/aragorn.png";
import v570 from "./os-android/iakaframe/gandalf.png";
import v571 from "./os-android/iakaframe/gimli.png";
import v572 from "./os-android/iakaframe/legolas.png";
import v573 from "./os-android/iakaframe/helm.png";
import v574 from "./os-android/iakaframe/loki.png";
import v575 from "./os-android/iakaframe/nathalie.png";
import v576 from "./os-macos/autobots/optimus.png";
import v577 from "./os-macos/autobots/bumblebee.png";
import v578 from "./os-macos/autobots/ratchet.png";
import v579 from "./os-macos/autobots/wheeljack.png";
import v580 from "./os-macos/autobots/hound.png";
import v581 from "./os-macos/autobots/ironhide.png";
import v582 from "./os-macos/autobots/jazz.png";
import v583 from "./os-macos/autobots/blaster.png";
import v584 from "./os-macos/avengers/nickfury.png";
import v585 from "./os-macos/avengers/capamerica.png";
import v586 from "./os-macos/avengers/strange.png";
import v587 from "./os-macos/avengers/ironman.png";
import v588 from "./os-macos/avengers/hawkeye.png";
import v589 from "./os-macos/avengers/thor.png";
import v590 from "./os-macos/avengers/lokiavg.png";
import v591 from "./os-macos/avengers/spiderman.png";
import v592 from "./os-macos/dc-justice/superman.png";
import v593 from "./os-macos/dc-justice/batman.png";
import v594 from "./os-macos/dc-justice/wonderwoman.png";
import v595 from "./os-macos/dc-justice/cyborg.png";
import v596 from "./os-macos/dc-justice/greenlantern.png";
import v597 from "./os-macos/dc-justice/aquaman.png";
import v598 from "./os-macos/dc-justice/flash.png";
import v599 from "./os-macos/dc-justice/manhunter.png";
import v600 from "./os-macos/defenders/daredevil.png";
import v601 from "./os-macos/defenders/lukecage.png";
import v602 from "./os-macos/defenders/jessicajones.png";
import v603 from "./os-macos/defenders/ironfist.png";
import v604 from "./os-macos/defenders/punisher.png";
import v605 from "./os-macos/defenders/kingpin.png";
import v606 from "./os-macos/defenders/elektra.png";
import v607 from "./os-macos/defenders/foggynelson.png";
import v608 from "./os-macos/harry-potter/dumbledore.png";
import v609 from "./os-macos/harry-potter/harry.png";
import v610 from "./os-macos/harry-potter/mcgonagall.png";
import v611 from "./os-macos/harry-potter/hagrid.png";
import v612 from "./os-macos/harry-potter/hermione.png";
import v613 from "./os-macos/harry-potter/snape.png";
import v614 from "./os-macos/harry-potter/luna.png";
import v615 from "./os-macos/harry-potter/ron.png";
import v616 from "./os-macos/lotr/galadriel.png";
import v617 from "./os-macos/lotr/aragorn.png";
import v618 from "./os-macos/lotr/gandalf.png";
import v619 from "./os-macos/lotr/gimli.png";
import v620 from "./os-macos/lotr/legolas.png";
import v621 from "./os-macos/lotr/boromir.png";
import v622 from "./os-macos/lotr/bilbo.png";
import v623 from "./os-macos/lotr/frodo.png";
import v624 from "./os-macos/norse/odin.png";
import v625 from "./os-macos/norse/thornorse.png";
import v626 from "./os-macos/norse/mimir.png";
import v627 from "./os-macos/norse/brokkr.png";
import v628 from "./os-macos/norse/heimdall.png";
import v629 from "./os-macos/norse/tyr.png";
import v630 from "./os-macos/norse/loki.png";
import v631 from "./os-macos/norse/bragi.png";
import v632 from "./os-macos/olympians/zeus.png";
import v633 from "./os-macos/olympians/ares.png";
import v634 from "./os-macos/olympians/athena.png";
import v635 from "./os-macos/olympians/hephaestus.png";
import v636 from "./os-macos/olympians/apollo.png";
import v637 from "./os-macos/olympians/hades.png";
import v638 from "./os-macos/olympians/dionysus.png";
import v639 from "./os-macos/olympians/hermes.png";
import v640 from "./os-macos/rebels/leia.png";
import v641 from "./os-macos/rebels/hansolo.png";
import v642 from "./os-macos/rebels/obiwan.png";
import v643 from "./os-macos/rebels/luke.png";
import v644 from "./os-macos/rebels/chewbacca.png";
import v645 from "./os-macos/rebels/lando.png";
import v646 from "./os-macos/rebels/c3po.png";
import v647 from "./os-macos/rebels/r2d2.png";
import v648 from "./os-macos/starfleet/picard.png";
import v649 from "./os-macos/starfleet/riker.png";
import v650 from "./os-macos/starfleet/data.png";
import v651 from "./os-macos/starfleet/geordi.png";
import v652 from "./os-macos/starfleet/worf.png";
import v653 from "./os-macos/starfleet/crusher.png";
import v654 from "./os-macos/starfleet/troi.png";
import v655 from "./os-macos/starfleet/wesley.png";
import v656 from "./os-macos/xmen/profx.png";
import v657 from "./os-macos/xmen/cyclops.png";
import v658 from "./os-macos/xmen/beast.png";
import v659 from "./os-macos/xmen/forge.png";
import v660 from "./os-macos/xmen/wolverine.png";
import v661 from "./os-macos/xmen/colossus.png";
import v662 from "./os-macos/xmen/mystique.png";
import v663 from "./os-macos/xmen/nightcrawler.png";
import v664 from "./os-macos/iakaframe/odin.png";
import v665 from "./os-macos/iakaframe/aragorn.png";
import v666 from "./os-macos/iakaframe/gandalf.png";
import v667 from "./os-macos/iakaframe/gimli.png";
import v668 from "./os-macos/iakaframe/legolas.png";
import v669 from "./os-macos/iakaframe/helm.png";
import v670 from "./os-macos/iakaframe/loki.png";
import v671 from "./os-macos/iakaframe/nathalie.png";
import v672 from "./cartoon-std/autobots/optimus.png";
import v673 from "./cartoon-std/autobots/bumblebee.png";
import v674 from "./cartoon-std/autobots/ratchet.png";
import v675 from "./cartoon-std/autobots/wheeljack.png";
import v676 from "./cartoon-std/autobots/hound.png";
import v677 from "./cartoon-std/autobots/ironhide.png";
import v678 from "./cartoon-std/autobots/jazz.png";
import v679 from "./cartoon-std/autobots/blaster.png";
import v680 from "./cartoon-std/avengers/nickfury.png";
import v681 from "./cartoon-std/avengers/capamerica.png";
import v682 from "./cartoon-std/avengers/strange.png";
import v683 from "./cartoon-std/avengers/ironman.png";
import v684 from "./cartoon-std/avengers/hawkeye.png";
import v685 from "./cartoon-std/avengers/thor.png";
import v686 from "./cartoon-std/avengers/lokiavg.png";
import v687 from "./cartoon-std/avengers/spiderman.png";
import v688 from "./cartoon-std/dc-justice/superman.png";
import v689 from "./cartoon-std/dc-justice/batman.png";
import v690 from "./cartoon-std/dc-justice/wonderwoman.png";
import v691 from "./cartoon-std/dc-justice/cyborg.png";
import v692 from "./cartoon-std/dc-justice/greenlantern.png";
import v693 from "./cartoon-std/dc-justice/aquaman.png";
import v694 from "./cartoon-std/dc-justice/flash.png";
import v695 from "./cartoon-std/dc-justice/manhunter.png";
import v696 from "./cartoon-std/defenders/daredevil.png";
import v697 from "./cartoon-std/defenders/lukecage.png";
import v698 from "./cartoon-std/defenders/jessicajones.png";
import v699 from "./cartoon-std/defenders/ironfist.png";
import v700 from "./cartoon-std/defenders/punisher.png";
import v701 from "./cartoon-std/defenders/kingpin.png";
import v702 from "./cartoon-std/defenders/elektra.png";
import v703 from "./cartoon-std/defenders/foggynelson.png";
import v704 from "./cartoon-std/harry-potter/dumbledore.png";
import v705 from "./cartoon-std/harry-potter/harry.png";
import v706 from "./cartoon-std/harry-potter/mcgonagall.png";
import v707 from "./cartoon-std/harry-potter/hagrid.png";
import v708 from "./cartoon-std/harry-potter/hermione.png";
import v709 from "./cartoon-std/harry-potter/snape.png";
import v710 from "./cartoon-std/harry-potter/luna.png";
import v711 from "./cartoon-std/harry-potter/ron.png";
import v712 from "./cartoon-std/lotr/galadriel.png";
import v713 from "./cartoon-std/lotr/aragorn.png";
import v714 from "./cartoon-std/lotr/gandalf.png";
import v715 from "./cartoon-std/lotr/gimli.png";
import v716 from "./cartoon-std/lotr/legolas.png";
import v717 from "./cartoon-std/lotr/boromir.png";
import v718 from "./cartoon-std/lotr/bilbo.png";
import v719 from "./cartoon-std/lotr/frodo.png";
import v720 from "./cartoon-std/norse/odin.png";
import v721 from "./cartoon-std/norse/thornorse.png";
import v722 from "./cartoon-std/norse/mimir.png";
import v723 from "./cartoon-std/norse/brokkr.png";
import v724 from "./cartoon-std/norse/heimdall.png";
import v725 from "./cartoon-std/norse/tyr.png";
import v726 from "./cartoon-std/norse/loki.png";
import v727 from "./cartoon-std/norse/bragi.png";
import v728 from "./cartoon-std/olympians/zeus.png";
import v729 from "./cartoon-std/olympians/ares.png";
import v730 from "./cartoon-std/olympians/athena.png";
import v731 from "./cartoon-std/olympians/hephaestus.png";
import v732 from "./cartoon-std/olympians/apollo.png";
import v733 from "./cartoon-std/olympians/hades.png";
import v734 from "./cartoon-std/olympians/dionysus.png";
import v735 from "./cartoon-std/olympians/hermes.png";
import v736 from "./cartoon-std/rebels/leia.png";
import v737 from "./cartoon-std/rebels/hansolo.png";
import v738 from "./cartoon-std/rebels/obiwan.png";
import v739 from "./cartoon-std/rebels/luke.png";
import v740 from "./cartoon-std/rebels/chewbacca.png";
import v741 from "./cartoon-std/rebels/lando.png";
import v742 from "./cartoon-std/rebels/c3po.png";
import v743 from "./cartoon-std/rebels/r2d2.png";
import v744 from "./cartoon-std/starfleet/picard.png";
import v745 from "./cartoon-std/starfleet/riker.png";
import v746 from "./cartoon-std/starfleet/data.png";
import v747 from "./cartoon-std/starfleet/geordi.png";
import v748 from "./cartoon-std/starfleet/worf.png";
import v749 from "./cartoon-std/starfleet/crusher.png";
import v750 from "./cartoon-std/starfleet/troi.png";
import v751 from "./cartoon-std/starfleet/wesley.png";
import v752 from "./cartoon-std/xmen/profx.png";
import v753 from "./cartoon-std/xmen/cyclops.png";
import v754 from "./cartoon-std/xmen/beast.png";
import v755 from "./cartoon-std/xmen/forge.png";
import v756 from "./cartoon-std/xmen/wolverine.png";
import v757 from "./cartoon-std/xmen/colossus.png";
import v758 from "./cartoon-std/xmen/mystique.png";
import v759 from "./cartoon-std/xmen/nightcrawler.png";
import v760 from "./cartoon-std/iakaframe/odin.png";
import v761 from "./cartoon-std/iakaframe/aragorn.png";
import v762 from "./cartoon-std/iakaframe/gandalf.png";
import v763 from "./cartoon-std/iakaframe/gimli.png";
import v764 from "./cartoon-std/iakaframe/legolas.png";
import v765 from "./cartoon-std/iakaframe/helm.png";
import v766 from "./cartoon-std/iakaframe/loki.png";
import v767 from "./cartoon-std/iakaframe/nathalie.png";
import v768 from "./photoreal-modern/autobots/optimus.png";
import v769 from "./photoreal-modern/autobots/bumblebee.png";
import v770 from "./photoreal-modern/autobots/ratchet.png";
import v771 from "./photoreal-modern/autobots/wheeljack.png";
import v772 from "./photoreal-modern/autobots/hound.png";
import v773 from "./photoreal-modern/autobots/ironhide.png";
import v774 from "./photoreal-modern/autobots/jazz.png";
import v775 from "./photoreal-modern/autobots/blaster.png";
import v776 from "./photoreal-modern/avengers/nickfury.png";
import v777 from "./photoreal-modern/avengers/capamerica.png";
import v778 from "./photoreal-modern/avengers/strange.png";
import v779 from "./photoreal-modern/avengers/ironman.png";
import v780 from "./photoreal-modern/avengers/hawkeye.png";
import v781 from "./photoreal-modern/avengers/thor.png";
import v782 from "./photoreal-modern/avengers/lokiavg.png";
import v783 from "./photoreal-modern/avengers/spiderman.png";
import v784 from "./photoreal-modern/dc-justice/superman.png";
import v785 from "./photoreal-modern/dc-justice/batman.png";
import v786 from "./photoreal-modern/dc-justice/wonderwoman.png";
import v787 from "./photoreal-modern/dc-justice/cyborg.png";
import v788 from "./photoreal-modern/dc-justice/greenlantern.png";
import v789 from "./photoreal-modern/dc-justice/aquaman.png";
import v790 from "./photoreal-modern/dc-justice/flash.png";
import v791 from "./photoreal-modern/dc-justice/manhunter.png";
import v792 from "./photoreal-modern/defenders/daredevil.png";
import v793 from "./photoreal-modern/defenders/lukecage.png";
import v794 from "./photoreal-modern/defenders/jessicajones.png";
import v795 from "./photoreal-modern/defenders/ironfist.png";
import v796 from "./photoreal-modern/defenders/punisher.png";
import v797 from "./photoreal-modern/defenders/kingpin.png";
import v798 from "./photoreal-modern/defenders/elektra.png";
import v799 from "./photoreal-modern/defenders/foggynelson.png";
import v800 from "./photoreal-modern/harry-potter/dumbledore.png";
import v801 from "./photoreal-modern/harry-potter/harry.png";
import v802 from "./photoreal-modern/harry-potter/mcgonagall.png";
import v803 from "./photoreal-modern/harry-potter/hagrid.png";
import v804 from "./photoreal-modern/harry-potter/hermione.png";
import v805 from "./photoreal-modern/harry-potter/snape.png";
import v806 from "./photoreal-modern/harry-potter/luna.png";
import v807 from "./photoreal-modern/harry-potter/ron.png";
import v808 from "./photoreal-modern/lotr/galadriel.png";
import v809 from "./photoreal-modern/lotr/aragorn.png";
import v810 from "./photoreal-modern/lotr/gandalf.png";
import v811 from "./photoreal-modern/lotr/gimli.png";
import v812 from "./photoreal-modern/lotr/legolas.png";
import v813 from "./photoreal-modern/lotr/boromir.png";
import v814 from "./photoreal-modern/lotr/bilbo.png";
import v815 from "./photoreal-modern/lotr/frodo.png";
import v816 from "./photoreal-modern/norse/odin.png";
import v817 from "./photoreal-modern/norse/thornorse.png";
import v818 from "./photoreal-modern/norse/mimir.png";
import v819 from "./photoreal-modern/norse/brokkr.png";
import v820 from "./photoreal-modern/norse/heimdall.png";
import v821 from "./photoreal-modern/norse/tyr.png";
import v822 from "./photoreal-modern/norse/loki.png";
import v823 from "./photoreal-modern/norse/bragi.png";
import v824 from "./photoreal-modern/olympians/zeus.png";
import v825 from "./photoreal-modern/olympians/ares.png";
import v826 from "./photoreal-modern/olympians/athena.png";
import v827 from "./photoreal-modern/olympians/hephaestus.png";
import v828 from "./photoreal-modern/olympians/apollo.png";
import v829 from "./photoreal-modern/olympians/hades.png";
import v830 from "./photoreal-modern/olympians/dionysus.png";
import v831 from "./photoreal-modern/olympians/hermes.png";
import v832 from "./photoreal-modern/rebels/leia.png";
import v833 from "./photoreal-modern/rebels/hansolo.png";
import v834 from "./photoreal-modern/rebels/obiwan.png";
import v835 from "./photoreal-modern/rebels/luke.png";
import v836 from "./photoreal-modern/rebels/chewbacca.png";
import v837 from "./photoreal-modern/rebels/lando.png";
import v838 from "./photoreal-modern/rebels/c3po.png";
import v839 from "./photoreal-modern/rebels/r2d2.png";
import v840 from "./photoreal-modern/starfleet/picard.png";
import v841 from "./photoreal-modern/starfleet/riker.png";
import v842 from "./photoreal-modern/starfleet/data.png";
import v843 from "./photoreal-modern/starfleet/geordi.png";
import v844 from "./photoreal-modern/starfleet/worf.png";
import v845 from "./photoreal-modern/starfleet/crusher.png";
import v846 from "./photoreal-modern/starfleet/troi.png";
import v847 from "./photoreal-modern/starfleet/wesley.png";
import v848 from "./photoreal-modern/xmen/profx.png";
import v849 from "./photoreal-modern/xmen/cyclops.png";
import v850 from "./photoreal-modern/xmen/beast.png";
import v851 from "./photoreal-modern/xmen/forge.png";
import v852 from "./photoreal-modern/xmen/wolverine.png";
import v853 from "./photoreal-modern/xmen/colossus.png";
import v854 from "./photoreal-modern/xmen/mystique.png";
import v855 from "./photoreal-modern/xmen/nightcrawler.png";
import v856 from "./photoreal-modern/iakaframe/odin.png";
import v857 from "./photoreal-modern/iakaframe/aragorn.png";
import v858 from "./photoreal-modern/iakaframe/gandalf.png";
import v859 from "./photoreal-modern/iakaframe/gimli.png";
import v860 from "./photoreal-modern/iakaframe/legolas.png";
import v861 from "./photoreal-modern/iakaframe/helm.png";
import v862 from "./photoreal-modern/iakaframe/loki.png";
import v863 from "./photoreal-modern/iakaframe/nathalie.png";
import v864 from "./studio-clair/autobots/optimus.png";
import v865 from "./studio-clair/autobots/bumblebee.png";
import v866 from "./studio-clair/autobots/ratchet.png";
import v867 from "./studio-clair/autobots/wheeljack.png";
import v868 from "./studio-clair/autobots/hound.png";
import v869 from "./studio-clair/autobots/ironhide.png";
import v870 from "./studio-clair/autobots/jazz.png";
import v871 from "./studio-clair/autobots/blaster.png";
import v872 from "./studio-clair/avengers/nickfury.png";
import v873 from "./studio-clair/avengers/capamerica.png";
import v874 from "./studio-clair/avengers/strange.png";
import v875 from "./studio-clair/avengers/ironman.png";
import v876 from "./studio-clair/avengers/hawkeye.png";
import v877 from "./studio-clair/avengers/thor.png";
import v878 from "./studio-clair/avengers/lokiavg.png";
import v879 from "./studio-clair/avengers/spiderman.png";
import v880 from "./studio-clair/dc-justice/superman.png";
import v881 from "./studio-clair/dc-justice/batman.png";
import v882 from "./studio-clair/dc-justice/wonderwoman.png";
import v883 from "./studio-clair/dc-justice/cyborg.png";
import v884 from "./studio-clair/dc-justice/greenlantern.png";
import v885 from "./studio-clair/dc-justice/aquaman.png";
import v886 from "./studio-clair/dc-justice/flash.png";
import v887 from "./studio-clair/dc-justice/manhunter.png";
import v888 from "./studio-clair/defenders/daredevil.png";
import v889 from "./studio-clair/defenders/lukecage.png";
import v890 from "./studio-clair/defenders/jessicajones.png";
import v891 from "./studio-clair/defenders/ironfist.png";
import v892 from "./studio-clair/defenders/punisher.png";
import v893 from "./studio-clair/defenders/kingpin.png";
import v894 from "./studio-clair/defenders/elektra.png";
import v895 from "./studio-clair/defenders/foggynelson.png";
import v896 from "./studio-clair/harry-potter/dumbledore.png";
import v897 from "./studio-clair/harry-potter/harry.png";
import v898 from "./studio-clair/harry-potter/mcgonagall.png";
import v899 from "./studio-clair/harry-potter/hagrid.png";
import v900 from "./studio-clair/harry-potter/hermione.png";
import v901 from "./studio-clair/harry-potter/snape.png";
import v902 from "./studio-clair/harry-potter/luna.png";
import v903 from "./studio-clair/harry-potter/ron.png";
import v904 from "./studio-clair/lotr/galadriel.png";
import v905 from "./studio-clair/lotr/aragorn.png";
import v906 from "./studio-clair/lotr/gandalf.png";
import v907 from "./studio-clair/lotr/gimli.png";
import v908 from "./studio-clair/lotr/legolas.png";
import v909 from "./studio-clair/lotr/boromir.png";
import v910 from "./studio-clair/lotr/bilbo.png";
import v911 from "./studio-clair/lotr/frodo.png";
import v912 from "./studio-clair/norse/odin.png";
import v913 from "./studio-clair/norse/thornorse.png";
import v914 from "./studio-clair/norse/mimir.png";
import v915 from "./studio-clair/norse/brokkr.png";
import v916 from "./studio-clair/norse/heimdall.png";
import v917 from "./studio-clair/norse/tyr.png";
import v918 from "./studio-clair/norse/loki.png";
import v919 from "./studio-clair/norse/bragi.png";
import v920 from "./studio-clair/olympians/zeus.png";
import v921 from "./studio-clair/olympians/ares.png";
import v922 from "./studio-clair/olympians/athena.png";
import v923 from "./studio-clair/olympians/hephaestus.png";
import v924 from "./studio-clair/olympians/apollo.png";
import v925 from "./studio-clair/olympians/hades.png";
import v926 from "./studio-clair/olympians/dionysus.png";
import v927 from "./studio-clair/olympians/hermes.png";
import v928 from "./studio-clair/rebels/leia.png";
import v929 from "./studio-clair/rebels/hansolo.png";
import v930 from "./studio-clair/rebels/obiwan.png";
import v931 from "./studio-clair/rebels/luke.png";
import v932 from "./studio-clair/rebels/chewbacca.png";
import v933 from "./studio-clair/rebels/lando.png";
import v934 from "./studio-clair/rebels/c3po.png";
import v935 from "./studio-clair/rebels/r2d2.png";
import v936 from "./studio-clair/starfleet/picard.png";
import v937 from "./studio-clair/starfleet/riker.png";
import v938 from "./studio-clair/starfleet/data.png";
import v939 from "./studio-clair/starfleet/geordi.png";
import v940 from "./studio-clair/starfleet/worf.png";
import v941 from "./studio-clair/starfleet/crusher.png";
import v942 from "./studio-clair/starfleet/troi.png";
import v943 from "./studio-clair/starfleet/wesley.png";
import v944 from "./studio-clair/xmen/profx.png";
import v945 from "./studio-clair/xmen/cyclops.png";
import v946 from "./studio-clair/xmen/beast.png";
import v947 from "./studio-clair/xmen/forge.png";
import v948 from "./studio-clair/xmen/wolverine.png";
import v949 from "./studio-clair/xmen/colossus.png";
import v950 from "./studio-clair/xmen/mystique.png";
import v951 from "./studio-clair/xmen/nightcrawler.png";

export type VignetteManifest = Record<
  string,
  Record<string, Record<number, string>>
>;

export const VIGNETTES: VignetteManifest = {
  "naonedge-dark": {
    "autobots": {
      0: v0,
      1: v1,
      2: v2,
      3: v3,
      4: v4,
      5: v5,
      6: v6,
      7: v7,
    },
    "avengers": {
      0: v8,
      1: v9,
      2: v10,
      3: v11,
      4: v12,
      5: v13,
      6: v14,
      7: v15,
    },
    "dc-justice": {
      0: v16,
      1: v17,
      2: v18,
      3: v19,
      4: v20,
      5: v21,
      6: v22,
      7: v23,
    },
    "defenders": {
      0: v24,
      1: v25,
      2: v26,
      3: v27,
      4: v28,
      5: v29,
      6: v30,
      7: v31,
    },
    "harry-potter": {
      0: v32,
      1: v33,
      2: v34,
      3: v35,
      4: v36,
      5: v37,
      6: v38,
      7: v39,
    },
    "lotr": {
      0: v40,
      1: v41,
      2: v42,
      3: v43,
      4: v44,
      5: v45,
      6: v46,
      7: v47,
    },
    "norse": {
      0: v48,
      1: v49,
      2: v50,
      3: v51,
      4: v52,
      5: v53,
      6: v54,
      7: v55,
    },
    "olympians": {
      0: v56,
      1: v57,
      2: v58,
      3: v59,
      4: v60,
      5: v61,
      6: v62,
      7: v63,
    },
    "rebels": {
      0: v64,
      1: v65,
      2: v66,
      3: v67,
      4: v68,
      5: v69,
      6: v70,
      7: v71,
    },
    "starfleet": {
      0: v72,
      1: v73,
      2: v74,
      3: v75,
      4: v76,
      5: v77,
      6: v78,
      7: v79,
    },
    "xmen": {
      0: v80,
      1: v81,
      2: v82,
      3: v83,
      4: v84,
      5: v85,
      6: v86,
      7: v87,
    },
    "iakaframe": {
      0: v88,
      1: v89,
      2: v90,
      3: v91,
      4: v92,
      5: v93,
      6: v94,
      7: v95,
    },
  },
  "naonedge-light": {
    "autobots": {
      0: v96,
      1: v97,
      2: v98,
      3: v99,
      4: v100,
      5: v101,
      6: v102,
      7: v103,
    },
    "avengers": {
      0: v104,
      1: v105,
      2: v106,
      3: v107,
      4: v108,
      5: v109,
      6: v110,
      7: v111,
    },
    "dc-justice": {
      0: v112,
      1: v113,
      2: v114,
      3: v115,
      4: v116,
      5: v117,
      6: v118,
      7: v119,
    },
    "defenders": {
      0: v120,
      1: v121,
      2: v122,
      3: v123,
      4: v124,
      5: v125,
      6: v126,
      7: v127,
    },
    "harry-potter": {
      0: v128,
      1: v129,
      2: v130,
      3: v131,
      4: v132,
      5: v133,
      6: v134,
      7: v135,
    },
    "lotr": {
      0: v136,
      1: v137,
      2: v138,
      3: v139,
      4: v140,
      5: v141,
      6: v142,
      7: v143,
    },
    "norse": {
      0: v144,
      1: v145,
      2: v146,
      3: v147,
      4: v148,
      5: v149,
      6: v150,
      7: v151,
    },
    "olympians": {
      0: v152,
      1: v153,
      2: v154,
      3: v155,
      4: v156,
      5: v157,
      6: v158,
      7: v159,
    },
    "rebels": {
      0: v160,
      1: v161,
      2: v162,
      3: v163,
      4: v164,
      5: v165,
      6: v166,
      7: v167,
    },
    "starfleet": {
      0: v168,
      1: v169,
      2: v170,
      3: v171,
      4: v172,
      5: v173,
      6: v174,
      7: v175,
    },
    "xmen": {
      0: v176,
      1: v177,
      2: v178,
      3: v179,
      4: v180,
      5: v181,
      6: v182,
      7: v183,
    },
    "iakaframe": {
      0: v184,
      1: v185,
      2: v186,
      3: v187,
      4: v188,
      5: v189,
      6: v190,
      7: v191,
    },
  },
  "grimoire-dark-fantasy": {
    "autobots": {
      0: v192,
      1: v193,
      2: v194,
      3: v195,
      4: v196,
      5: v197,
      6: v198,
      7: v199,
    },
    "avengers": {
      0: v200,
      1: v201,
      2: v202,
      3: v203,
      4: v204,
      5: v205,
      6: v206,
      7: v207,
    },
    "dc-justice": {
      0: v208,
      1: v209,
      2: v210,
      3: v211,
      4: v212,
      5: v213,
      6: v214,
      7: v215,
    },
    "defenders": {
      0: v216,
      1: v217,
      2: v218,
      3: v219,
      4: v220,
      5: v221,
      6: v222,
      7: v223,
    },
    "harry-potter": {
      0: v224,
      1: v225,
      2: v226,
      3: v227,
      4: v228,
      5: v229,
      6: v230,
      7: v231,
    },
    "lotr": {
      0: v232,
      1: v233,
      2: v234,
      3: v235,
      4: v236,
      5: v237,
      6: v238,
      7: v239,
    },
    "norse": {
      0: v240,
      1: v241,
      2: v242,
      3: v243,
      4: v244,
      5: v245,
      6: v246,
      7: v247,
    },
    "olympians": {
      0: v248,
      1: v249,
      2: v250,
      3: v251,
      4: v252,
      5: v253,
      6: v254,
      7: v255,
    },
    "rebels": {
      0: v256,
      1: v257,
      2: v258,
      3: v259,
      4: v260,
      5: v261,
      6: v262,
      7: v263,
    },
    "starfleet": {
      0: v264,
      1: v265,
      2: v266,
      3: v267,
      4: v268,
      5: v269,
      6: v270,
      7: v271,
    },
    "xmen": {
      0: v272,
      1: v273,
      2: v274,
      3: v275,
      4: v276,
      5: v277,
      6: v278,
      7: v279,
    },
    "iakaframe": {
      0: v280,
      1: v281,
      2: v282,
      3: v283,
      4: v284,
      5: v285,
      6: v286,
      7: v287,
    },
  },
  "os-windows": {
    "autobots": {
      0: v288,
      1: v289,
      2: v290,
      3: v291,
      4: v292,
      5: v293,
      6: v294,
      7: v295,
    },
    "avengers": {
      0: v296,
      1: v297,
      2: v298,
      3: v299,
      4: v300,
      5: v301,
      6: v302,
      7: v303,
    },
    "dc-justice": {
      0: v304,
      1: v305,
      2: v306,
      3: v307,
      4: v308,
      5: v309,
      6: v310,
      7: v311,
    },
    "defenders": {
      0: v312,
      1: v313,
      2: v314,
      3: v315,
      4: v316,
      5: v317,
      6: v318,
      7: v319,
    },
    "harry-potter": {
      0: v320,
      1: v321,
      2: v322,
      3: v323,
      4: v324,
      5: v325,
      6: v326,
      7: v327,
    },
    "lotr": {
      0: v328,
      1: v329,
      2: v330,
      3: v331,
      4: v332,
      5: v333,
      6: v334,
      7: v335,
    },
    "norse": {
      0: v336,
      1: v337,
      2: v338,
      3: v339,
      4: v340,
      5: v341,
      6: v342,
      7: v343,
    },
    "olympians": {
      0: v344,
      1: v345,
      2: v346,
      3: v347,
      4: v348,
      5: v349,
      6: v350,
      7: v351,
    },
    "rebels": {
      0: v352,
      1: v353,
      2: v354,
      3: v355,
      4: v356,
      5: v357,
      6: v358,
      7: v359,
    },
    "starfleet": {
      0: v360,
      1: v361,
      2: v362,
      3: v363,
      4: v364,
      5: v365,
      6: v366,
      7: v367,
    },
    "xmen": {
      0: v368,
      1: v369,
      2: v370,
      3: v371,
      4: v372,
      5: v373,
      6: v374,
      7: v375,
    },
    "iakaframe": {
      0: v376,
      1: v377,
      2: v378,
      3: v379,
      4: v380,
      5: v381,
      6: v382,
      7: v383,
    },
  },
  "os-ubuntu": {
    "autobots": {
      0: v384,
      1: v385,
      2: v386,
      3: v387,
      4: v388,
      5: v389,
      6: v390,
      7: v391,
    },
    "avengers": {
      0: v392,
      1: v393,
      2: v394,
      3: v395,
      4: v396,
      5: v397,
      6: v398,
      7: v399,
    },
    "dc-justice": {
      0: v400,
      1: v401,
      2: v402,
      3: v403,
      4: v404,
      5: v405,
      6: v406,
      7: v407,
    },
    "defenders": {
      0: v408,
      1: v409,
      2: v410,
      3: v411,
      4: v412,
      5: v413,
      6: v414,
      7: v415,
    },
    "harry-potter": {
      0: v416,
      1: v417,
      2: v418,
      3: v419,
      4: v420,
      5: v421,
      6: v422,
      7: v423,
    },
    "lotr": {
      0: v424,
      1: v425,
      2: v426,
      3: v427,
      4: v428,
      5: v429,
      6: v430,
      7: v431,
    },
    "norse": {
      0: v432,
      1: v433,
      2: v434,
      3: v435,
      4: v436,
      5: v437,
      6: v438,
      7: v439,
    },
    "olympians": {
      0: v440,
      1: v441,
      2: v442,
      3: v443,
      4: v444,
      5: v445,
      6: v446,
      7: v447,
    },
    "rebels": {
      0: v448,
      1: v449,
      2: v450,
      3: v451,
      4: v452,
      5: v453,
      6: v454,
      7: v455,
    },
    "starfleet": {
      0: v456,
      1: v457,
      2: v458,
      3: v459,
      4: v460,
      5: v461,
      6: v462,
      7: v463,
    },
    "xmen": {
      0: v464,
      1: v465,
      2: v466,
      3: v467,
      4: v468,
      5: v469,
      6: v470,
      7: v471,
    },
    "iakaframe": {
      0: v472,
      1: v473,
      2: v474,
      3: v475,
      4: v476,
      5: v477,
      6: v478,
      7: v479,
    },
  },
  "os-android": {
    "autobots": {
      0: v480,
      1: v481,
      2: v482,
      3: v483,
      4: v484,
      5: v485,
      6: v486,
      7: v487,
    },
    "avengers": {
      0: v488,
      1: v489,
      2: v490,
      3: v491,
      4: v492,
      5: v493,
      6: v494,
      7: v495,
    },
    "dc-justice": {
      0: v496,
      1: v497,
      2: v498,
      3: v499,
      4: v500,
      5: v501,
      6: v502,
      7: v503,
    },
    "defenders": {
      0: v504,
      1: v505,
      2: v506,
      3: v507,
      4: v508,
      5: v509,
      6: v510,
      7: v511,
    },
    "harry-potter": {
      0: v512,
      1: v513,
      2: v514,
      3: v515,
      4: v516,
      5: v517,
      6: v518,
      7: v519,
    },
    "lotr": {
      0: v520,
      1: v521,
      2: v522,
      3: v523,
      4: v524,
      5: v525,
      6: v526,
      7: v527,
    },
    "norse": {
      0: v528,
      1: v529,
      2: v530,
      3: v531,
      4: v532,
      5: v533,
      6: v534,
      7: v535,
    },
    "olympians": {
      0: v536,
      1: v537,
      2: v538,
      3: v539,
      4: v540,
      5: v541,
      6: v542,
      7: v543,
    },
    "rebels": {
      0: v544,
      1: v545,
      2: v546,
      3: v547,
      4: v548,
      5: v549,
      6: v550,
      7: v551,
    },
    "starfleet": {
      0: v552,
      1: v553,
      2: v554,
      3: v555,
      4: v556,
      5: v557,
      6: v558,
      7: v559,
    },
    "xmen": {
      0: v560,
      1: v561,
      2: v562,
      3: v563,
      4: v564,
      5: v565,
      6: v566,
      7: v567,
    },
    "iakaframe": {
      0: v568,
      1: v569,
      2: v570,
      3: v571,
      4: v572,
      5: v573,
      6: v574,
      7: v575,
    },
  },
  "os-macos": {
    "autobots": {
      0: v576,
      1: v577,
      2: v578,
      3: v579,
      4: v580,
      5: v581,
      6: v582,
      7: v583,
    },
    "avengers": {
      0: v584,
      1: v585,
      2: v586,
      3: v587,
      4: v588,
      5: v589,
      6: v590,
      7: v591,
    },
    "dc-justice": {
      0: v592,
      1: v593,
      2: v594,
      3: v595,
      4: v596,
      5: v597,
      6: v598,
      7: v599,
    },
    "defenders": {
      0: v600,
      1: v601,
      2: v602,
      3: v603,
      4: v604,
      5: v605,
      6: v606,
      7: v607,
    },
    "harry-potter": {
      0: v608,
      1: v609,
      2: v610,
      3: v611,
      4: v612,
      5: v613,
      6: v614,
      7: v615,
    },
    "lotr": {
      0: v616,
      1: v617,
      2: v618,
      3: v619,
      4: v620,
      5: v621,
      6: v622,
      7: v623,
    },
    "norse": {
      0: v624,
      1: v625,
      2: v626,
      3: v627,
      4: v628,
      5: v629,
      6: v630,
      7: v631,
    },
    "olympians": {
      0: v632,
      1: v633,
      2: v634,
      3: v635,
      4: v636,
      5: v637,
      6: v638,
      7: v639,
    },
    "rebels": {
      0: v640,
      1: v641,
      2: v642,
      3: v643,
      4: v644,
      5: v645,
      6: v646,
      7: v647,
    },
    "starfleet": {
      0: v648,
      1: v649,
      2: v650,
      3: v651,
      4: v652,
      5: v653,
      6: v654,
      7: v655,
    },
    "xmen": {
      0: v656,
      1: v657,
      2: v658,
      3: v659,
      4: v660,
      5: v661,
      6: v662,
      7: v663,
    },
    "iakaframe": {
      0: v664,
      1: v665,
      2: v666,
      3: v667,
      4: v668,
      5: v669,
      6: v670,
      7: v671,
    },
  },
  "cartoon-std": {
    "autobots": {
      0: v672,
      1: v673,
      2: v674,
      3: v675,
      4: v676,
      5: v677,
      6: v678,
      7: v679,
    },
    "avengers": {
      0: v680,
      1: v681,
      2: v682,
      3: v683,
      4: v684,
      5: v685,
      6: v686,
      7: v687,
    },
    "dc-justice": {
      0: v688,
      1: v689,
      2: v690,
      3: v691,
      4: v692,
      5: v693,
      6: v694,
      7: v695,
    },
    "defenders": {
      0: v696,
      1: v697,
      2: v698,
      3: v699,
      4: v700,
      5: v701,
      6: v702,
      7: v703,
    },
    "harry-potter": {
      0: v704,
      1: v705,
      2: v706,
      3: v707,
      4: v708,
      5: v709,
      6: v710,
      7: v711,
    },
    "lotr": {
      0: v712,
      1: v713,
      2: v714,
      3: v715,
      4: v716,
      5: v717,
      6: v718,
      7: v719,
    },
    "norse": {
      0: v720,
      1: v721,
      2: v722,
      3: v723,
      4: v724,
      5: v725,
      6: v726,
      7: v727,
    },
    "olympians": {
      0: v728,
      1: v729,
      2: v730,
      3: v731,
      4: v732,
      5: v733,
      6: v734,
      7: v735,
    },
    "rebels": {
      0: v736,
      1: v737,
      2: v738,
      3: v739,
      4: v740,
      5: v741,
      6: v742,
      7: v743,
    },
    "starfleet": {
      0: v744,
      1: v745,
      2: v746,
      3: v747,
      4: v748,
      5: v749,
      6: v750,
      7: v751,
    },
    "xmen": {
      0: v752,
      1: v753,
      2: v754,
      3: v755,
      4: v756,
      5: v757,
      6: v758,
      7: v759,
    },
    "iakaframe": {
      0: v760,
      1: v761,
      2: v762,
      3: v763,
      4: v764,
      5: v765,
      6: v766,
      7: v767,
    },
  },
  "photoreal-modern": {
    "autobots": {
      0: v768,
      1: v769,
      2: v770,
      3: v771,
      4: v772,
      5: v773,
      6: v774,
      7: v775,
    },
    "avengers": {
      0: v776,
      1: v777,
      2: v778,
      3: v779,
      4: v780,
      5: v781,
      6: v782,
      7: v783,
    },
    "dc-justice": {
      0: v784,
      1: v785,
      2: v786,
      3: v787,
      4: v788,
      5: v789,
      6: v790,
      7: v791,
    },
    "defenders": {
      0: v792,
      1: v793,
      2: v794,
      3: v795,
      4: v796,
      5: v797,
      6: v798,
      7: v799,
    },
    "harry-potter": {
      0: v800,
      1: v801,
      2: v802,
      3: v803,
      4: v804,
      5: v805,
      6: v806,
      7: v807,
    },
    "lotr": {
      0: v808,
      1: v809,
      2: v810,
      3: v811,
      4: v812,
      5: v813,
      6: v814,
      7: v815,
    },
    "norse": {
      0: v816,
      1: v817,
      2: v818,
      3: v819,
      4: v820,
      5: v821,
      6: v822,
      7: v823,
    },
    "olympians": {
      0: v824,
      1: v825,
      2: v826,
      3: v827,
      4: v828,
      5: v829,
      6: v830,
      7: v831,
    },
    "rebels": {
      0: v832,
      1: v833,
      2: v834,
      3: v835,
      4: v836,
      5: v837,
      6: v838,
      7: v839,
    },
    "starfleet": {
      0: v840,
      1: v841,
      2: v842,
      3: v843,
      4: v844,
      5: v845,
      6: v846,
      7: v847,
    },
    "xmen": {
      0: v848,
      1: v849,
      2: v850,
      3: v851,
      4: v852,
      5: v853,
      6: v854,
      7: v855,
    },
    "iakaframe": {
      0: v856,
      1: v857,
      2: v858,
      3: v859,
      4: v860,
      5: v861,
      6: v862,
      7: v863,
    },
  },
  "studio-clair": {
    "autobots": {
      0: v864,
      1: v865,
      2: v866,
      3: v867,
      4: v868,
      5: v869,
      6: v870,
      7: v871,
    },
    "avengers": {
      0: v872,
      1: v873,
      2: v874,
      3: v875,
      4: v876,
      5: v877,
      6: v878,
      7: v879,
    },
    "dc-justice": {
      0: v880,
      1: v881,
      2: v882,
      3: v883,
      4: v884,
      5: v885,
      6: v886,
      7: v887,
    },
    "defenders": {
      0: v888,
      1: v889,
      2: v890,
      3: v891,
      4: v892,
      5: v893,
      6: v894,
      7: v895,
    },
    "harry-potter": {
      0: v896,
      1: v897,
      2: v898,
      3: v899,
      4: v900,
      5: v901,
      6: v902,
      7: v903,
    },
    "lotr": {
      0: v904,
      1: v905,
      2: v906,
      3: v907,
      4: v908,
      5: v909,
      6: v910,
      7: v911,
    },
    "norse": {
      0: v912,
      1: v913,
      2: v914,
      3: v915,
      4: v916,
      5: v917,
      6: v918,
      7: v919,
    },
    "olympians": {
      0: v920,
      1: v921,
      2: v922,
      3: v923,
      4: v924,
      5: v925,
      6: v926,
      7: v927,
    },
    "rebels": {
      0: v928,
      1: v929,
      2: v930,
      3: v931,
      4: v932,
      5: v933,
      6: v934,
      7: v935,
    },
    "starfleet": {
      0: v936,
      1: v937,
      2: v938,
      3: v939,
      4: v940,
      5: v941,
      6: v942,
      7: v943,
    },
    "xmen": {
      0: v944,
      1: v945,
      2: v946,
      3: v947,
      4: v948,
      5: v949,
      6: v950,
      7: v951,
    },
    "iakaframe": {
    },
  },
};
