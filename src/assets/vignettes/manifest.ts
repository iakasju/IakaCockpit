/**
 * manifest.ts — GENERE par scripts/sync-vignettes.sh. NE PAS EDITER A LA MAIN.
 *
 * Mapping (charte-app -> team -> roleIndex 0..7 -> URL d'asset Vite servie en 'self').
 * L'ordre des roleIndex reflete teams.json (0=portefeuille, 1=coordination,
 * 2=cadrage, 3=dev, 4=qualite, 5=production, 6=design, 7=doc).
 * Teams : toutes celles de teams.json + pseudo-team 'iakaframe' (casting natif).
 * Source: chartes=[naonedge/dark naonedge/light grimoire/dark-fantasy os/windows os/ubuntu os/android os/macos cartoon/std photoreal/modern studio/clair].
 */
import v0 from "./naonedge-dark/autobots/optimus.webp";
import v1 from "./naonedge-dark/autobots/bumblebee.webp";
import v2 from "./naonedge-dark/autobots/ratchet.webp";
import v3 from "./naonedge-dark/autobots/wheeljack.webp";
import v4 from "./naonedge-dark/autobots/hound.webp";
import v5 from "./naonedge-dark/autobots/ironhide.webp";
import v6 from "./naonedge-dark/autobots/jazz.webp";
import v7 from "./naonedge-dark/autobots/blaster.webp";
import v8 from "./naonedge-dark/avengers/nickfury.webp";
import v9 from "./naonedge-dark/avengers/capamerica.webp";
import v10 from "./naonedge-dark/avengers/strange.webp";
import v11 from "./naonedge-dark/avengers/ironman.webp";
import v12 from "./naonedge-dark/avengers/hawkeye.webp";
import v13 from "./naonedge-dark/avengers/thor.webp";
import v14 from "./naonedge-dark/avengers/lokiavg.webp";
import v15 from "./naonedge-dark/avengers/spiderman.webp";
import v16 from "./naonedge-dark/dc-justice/superman.webp";
import v17 from "./naonedge-dark/dc-justice/batman.webp";
import v18 from "./naonedge-dark/dc-justice/wonderwoman.webp";
import v19 from "./naonedge-dark/dc-justice/cyborg.webp";
import v20 from "./naonedge-dark/dc-justice/greenlantern.webp";
import v21 from "./naonedge-dark/dc-justice/aquaman.webp";
import v22 from "./naonedge-dark/dc-justice/flash.webp";
import v23 from "./naonedge-dark/dc-justice/manhunter.webp";
import v24 from "./naonedge-dark/defenders/daredevil.webp";
import v25 from "./naonedge-dark/defenders/lukecage.webp";
import v26 from "./naonedge-dark/defenders/jessicajones.webp";
import v27 from "./naonedge-dark/defenders/ironfist.webp";
import v28 from "./naonedge-dark/defenders/punisher.webp";
import v29 from "./naonedge-dark/defenders/kingpin.webp";
import v30 from "./naonedge-dark/defenders/elektra.webp";
import v31 from "./naonedge-dark/defenders/foggynelson.webp";
import v32 from "./naonedge-dark/harry-potter/dumbledore.webp";
import v33 from "./naonedge-dark/harry-potter/harry.webp";
import v34 from "./naonedge-dark/harry-potter/mcgonagall.webp";
import v35 from "./naonedge-dark/harry-potter/hagrid.webp";
import v36 from "./naonedge-dark/harry-potter/hermione.webp";
import v37 from "./naonedge-dark/harry-potter/snape.webp";
import v38 from "./naonedge-dark/harry-potter/luna.webp";
import v39 from "./naonedge-dark/harry-potter/ron.webp";
import v40 from "./naonedge-dark/lotr/galadriel.webp";
import v41 from "./naonedge-dark/lotr/aragorn.webp";
import v42 from "./naonedge-dark/lotr/gandalf.webp";
import v43 from "./naonedge-dark/lotr/gimli.webp";
import v44 from "./naonedge-dark/lotr/legolas.webp";
import v45 from "./naonedge-dark/lotr/boromir.webp";
import v46 from "./naonedge-dark/lotr/bilbo.webp";
import v47 from "./naonedge-dark/lotr/frodo.webp";
import v48 from "./naonedge-dark/norse/odin.webp";
import v49 from "./naonedge-dark/norse/thornorse.webp";
import v50 from "./naonedge-dark/norse/mimir.webp";
import v51 from "./naonedge-dark/norse/brokkr.webp";
import v52 from "./naonedge-dark/norse/heimdall.webp";
import v53 from "./naonedge-dark/norse/tyr.webp";
import v54 from "./naonedge-dark/norse/loki.webp";
import v55 from "./naonedge-dark/norse/bragi.webp";
import v56 from "./naonedge-dark/olympians/zeus.webp";
import v57 from "./naonedge-dark/olympians/ares.webp";
import v58 from "./naonedge-dark/olympians/athena.webp";
import v59 from "./naonedge-dark/olympians/hephaestus.webp";
import v60 from "./naonedge-dark/olympians/apollo.webp";
import v61 from "./naonedge-dark/olympians/hades.webp";
import v62 from "./naonedge-dark/olympians/dionysus.webp";
import v63 from "./naonedge-dark/olympians/hermes.webp";
import v64 from "./naonedge-dark/rebels/leia.webp";
import v65 from "./naonedge-dark/rebels/hansolo.webp";
import v66 from "./naonedge-dark/rebels/obiwan.webp";
import v67 from "./naonedge-dark/rebels/luke.webp";
import v68 from "./naonedge-dark/rebels/chewbacca.webp";
import v69 from "./naonedge-dark/rebels/lando.webp";
import v70 from "./naonedge-dark/rebels/c3po.webp";
import v71 from "./naonedge-dark/rebels/r2d2.webp";
import v72 from "./naonedge-dark/starfleet/picard.webp";
import v73 from "./naonedge-dark/starfleet/riker.webp";
import v74 from "./naonedge-dark/starfleet/data.webp";
import v75 from "./naonedge-dark/starfleet/geordi.webp";
import v76 from "./naonedge-dark/starfleet/worf.webp";
import v77 from "./naonedge-dark/starfleet/crusher.webp";
import v78 from "./naonedge-dark/starfleet/troi.webp";
import v79 from "./naonedge-dark/starfleet/wesley.webp";
import v80 from "./naonedge-dark/xmen/profx.webp";
import v81 from "./naonedge-dark/xmen/cyclops.webp";
import v82 from "./naonedge-dark/xmen/beast.webp";
import v83 from "./naonedge-dark/xmen/forge.webp";
import v84 from "./naonedge-dark/xmen/wolverine.webp";
import v85 from "./naonedge-dark/xmen/colossus.webp";
import v86 from "./naonedge-dark/xmen/mystique.webp";
import v87 from "./naonedge-dark/xmen/nightcrawler.webp";
import v88 from "./naonedge-dark/iakaframe/odin.webp";
import v89 from "./naonedge-dark/iakaframe/aragorn.webp";
import v90 from "./naonedge-dark/iakaframe/gandalf.webp";
import v91 from "./naonedge-dark/iakaframe/gimli.webp";
import v92 from "./naonedge-dark/iakaframe/legolas.webp";
import v93 from "./naonedge-dark/iakaframe/loki.webp";
import v94 from "./naonedge-dark/iakaframe/nathalie.webp";
import v95 from "./naonedge-light/autobots/optimus.webp";
import v96 from "./naonedge-light/autobots/bumblebee.webp";
import v97 from "./naonedge-light/autobots/ratchet.webp";
import v98 from "./naonedge-light/autobots/wheeljack.webp";
import v99 from "./naonedge-light/autobots/hound.webp";
import v100 from "./naonedge-light/autobots/ironhide.webp";
import v101 from "./naonedge-light/autobots/jazz.webp";
import v102 from "./naonedge-light/autobots/blaster.webp";
import v103 from "./naonedge-light/avengers/nickfury.webp";
import v104 from "./naonedge-light/avengers/capamerica.webp";
import v105 from "./naonedge-light/avengers/strange.webp";
import v106 from "./naonedge-light/avengers/ironman.webp";
import v107 from "./naonedge-light/avengers/hawkeye.webp";
import v108 from "./naonedge-light/avengers/thor.webp";
import v109 from "./naonedge-light/avengers/lokiavg.webp";
import v110 from "./naonedge-light/avengers/spiderman.webp";
import v111 from "./naonedge-light/dc-justice/superman.webp";
import v112 from "./naonedge-light/dc-justice/batman.webp";
import v113 from "./naonedge-light/dc-justice/wonderwoman.webp";
import v114 from "./naonedge-light/dc-justice/cyborg.webp";
import v115 from "./naonedge-light/dc-justice/greenlantern.webp";
import v116 from "./naonedge-light/dc-justice/aquaman.webp";
import v117 from "./naonedge-light/dc-justice/flash.webp";
import v118 from "./naonedge-light/dc-justice/manhunter.webp";
import v119 from "./naonedge-light/defenders/daredevil.webp";
import v120 from "./naonedge-light/defenders/lukecage.webp";
import v121 from "./naonedge-light/defenders/jessicajones.webp";
import v122 from "./naonedge-light/defenders/ironfist.webp";
import v123 from "./naonedge-light/defenders/punisher.webp";
import v124 from "./naonedge-light/defenders/kingpin.webp";
import v125 from "./naonedge-light/defenders/elektra.webp";
import v126 from "./naonedge-light/defenders/foggynelson.webp";
import v127 from "./naonedge-light/harry-potter/dumbledore.webp";
import v128 from "./naonedge-light/harry-potter/harry.webp";
import v129 from "./naonedge-light/harry-potter/mcgonagall.webp";
import v130 from "./naonedge-light/harry-potter/hagrid.webp";
import v131 from "./naonedge-light/harry-potter/hermione.webp";
import v132 from "./naonedge-light/harry-potter/snape.webp";
import v133 from "./naonedge-light/harry-potter/luna.webp";
import v134 from "./naonedge-light/harry-potter/ron.webp";
import v135 from "./naonedge-light/lotr/galadriel.webp";
import v136 from "./naonedge-light/lotr/aragorn.webp";
import v137 from "./naonedge-light/lotr/gandalf.webp";
import v138 from "./naonedge-light/lotr/gimli.webp";
import v139 from "./naonedge-light/lotr/legolas.webp";
import v140 from "./naonedge-light/lotr/boromir.webp";
import v141 from "./naonedge-light/lotr/bilbo.webp";
import v142 from "./naonedge-light/lotr/frodo.webp";
import v143 from "./naonedge-light/norse/odin.webp";
import v144 from "./naonedge-light/norse/thornorse.webp";
import v145 from "./naonedge-light/norse/mimir.webp";
import v146 from "./naonedge-light/norse/brokkr.webp";
import v147 from "./naonedge-light/norse/heimdall.webp";
import v148 from "./naonedge-light/norse/tyr.webp";
import v149 from "./naonedge-light/norse/loki.webp";
import v150 from "./naonedge-light/norse/bragi.webp";
import v151 from "./naonedge-light/olympians/zeus.webp";
import v152 from "./naonedge-light/olympians/ares.webp";
import v153 from "./naonedge-light/olympians/athena.webp";
import v154 from "./naonedge-light/olympians/hephaestus.webp";
import v155 from "./naonedge-light/olympians/apollo.webp";
import v156 from "./naonedge-light/olympians/hades.webp";
import v157 from "./naonedge-light/olympians/dionysus.webp";
import v158 from "./naonedge-light/olympians/hermes.webp";
import v159 from "./naonedge-light/rebels/leia.webp";
import v160 from "./naonedge-light/rebels/hansolo.webp";
import v161 from "./naonedge-light/rebels/obiwan.webp";
import v162 from "./naonedge-light/rebels/luke.webp";
import v163 from "./naonedge-light/rebels/chewbacca.webp";
import v164 from "./naonedge-light/rebels/lando.webp";
import v165 from "./naonedge-light/rebels/c3po.webp";
import v166 from "./naonedge-light/rebels/r2d2.webp";
import v167 from "./naonedge-light/starfleet/picard.webp";
import v168 from "./naonedge-light/starfleet/riker.webp";
import v169 from "./naonedge-light/starfleet/data.webp";
import v170 from "./naonedge-light/starfleet/geordi.webp";
import v171 from "./naonedge-light/starfleet/worf.webp";
import v172 from "./naonedge-light/starfleet/crusher.webp";
import v173 from "./naonedge-light/starfleet/troi.webp";
import v174 from "./naonedge-light/starfleet/wesley.webp";
import v175 from "./naonedge-light/xmen/profx.webp";
import v176 from "./naonedge-light/xmen/cyclops.webp";
import v177 from "./naonedge-light/xmen/beast.webp";
import v178 from "./naonedge-light/xmen/forge.webp";
import v179 from "./naonedge-light/xmen/wolverine.webp";
import v180 from "./naonedge-light/xmen/colossus.webp";
import v181 from "./naonedge-light/xmen/mystique.webp";
import v182 from "./naonedge-light/xmen/nightcrawler.webp";
import v183 from "./naonedge-light/iakaframe/odin.webp";
import v184 from "./naonedge-light/iakaframe/aragorn.webp";
import v185 from "./naonedge-light/iakaframe/gandalf.webp";
import v186 from "./naonedge-light/iakaframe/gimli.webp";
import v187 from "./naonedge-light/iakaframe/legolas.webp";
import v188 from "./naonedge-light/iakaframe/loki.webp";
import v189 from "./naonedge-light/iakaframe/nathalie.webp";
import v190 from "./grimoire-dark-fantasy/autobots/optimus.webp";
import v191 from "./grimoire-dark-fantasy/autobots/bumblebee.webp";
import v192 from "./grimoire-dark-fantasy/autobots/ratchet.webp";
import v193 from "./grimoire-dark-fantasy/autobots/wheeljack.webp";
import v194 from "./grimoire-dark-fantasy/autobots/hound.webp";
import v195 from "./grimoire-dark-fantasy/autobots/ironhide.webp";
import v196 from "./grimoire-dark-fantasy/autobots/jazz.webp";
import v197 from "./grimoire-dark-fantasy/autobots/blaster.webp";
import v198 from "./grimoire-dark-fantasy/avengers/nickfury.webp";
import v199 from "./grimoire-dark-fantasy/avengers/capamerica.webp";
import v200 from "./grimoire-dark-fantasy/avengers/strange.webp";
import v201 from "./grimoire-dark-fantasy/avengers/ironman.webp";
import v202 from "./grimoire-dark-fantasy/avengers/hawkeye.webp";
import v203 from "./grimoire-dark-fantasy/avengers/thor.webp";
import v204 from "./grimoire-dark-fantasy/avengers/lokiavg.webp";
import v205 from "./grimoire-dark-fantasy/avengers/spiderman.webp";
import v206 from "./grimoire-dark-fantasy/dc-justice/superman.webp";
import v207 from "./grimoire-dark-fantasy/dc-justice/batman.webp";
import v208 from "./grimoire-dark-fantasy/dc-justice/wonderwoman.webp";
import v209 from "./grimoire-dark-fantasy/dc-justice/cyborg.webp";
import v210 from "./grimoire-dark-fantasy/dc-justice/greenlantern.webp";
import v211 from "./grimoire-dark-fantasy/dc-justice/aquaman.webp";
import v212 from "./grimoire-dark-fantasy/dc-justice/flash.webp";
import v213 from "./grimoire-dark-fantasy/dc-justice/manhunter.webp";
import v214 from "./grimoire-dark-fantasy/defenders/daredevil.webp";
import v215 from "./grimoire-dark-fantasy/defenders/lukecage.webp";
import v216 from "./grimoire-dark-fantasy/defenders/jessicajones.webp";
import v217 from "./grimoire-dark-fantasy/defenders/ironfist.webp";
import v218 from "./grimoire-dark-fantasy/defenders/punisher.webp";
import v219 from "./grimoire-dark-fantasy/defenders/kingpin.webp";
import v220 from "./grimoire-dark-fantasy/defenders/elektra.webp";
import v221 from "./grimoire-dark-fantasy/defenders/foggynelson.webp";
import v222 from "./grimoire-dark-fantasy/harry-potter/dumbledore.webp";
import v223 from "./grimoire-dark-fantasy/harry-potter/harry.webp";
import v224 from "./grimoire-dark-fantasy/harry-potter/mcgonagall.webp";
import v225 from "./grimoire-dark-fantasy/harry-potter/hagrid.webp";
import v226 from "./grimoire-dark-fantasy/harry-potter/hermione.webp";
import v227 from "./grimoire-dark-fantasy/harry-potter/snape.webp";
import v228 from "./grimoire-dark-fantasy/harry-potter/luna.webp";
import v229 from "./grimoire-dark-fantasy/harry-potter/ron.webp";
import v230 from "./grimoire-dark-fantasy/lotr/galadriel.webp";
import v231 from "./grimoire-dark-fantasy/lotr/aragorn.webp";
import v232 from "./grimoire-dark-fantasy/lotr/gandalf.webp";
import v233 from "./grimoire-dark-fantasy/lotr/gimli.webp";
import v234 from "./grimoire-dark-fantasy/lotr/legolas.webp";
import v235 from "./grimoire-dark-fantasy/lotr/boromir.webp";
import v236 from "./grimoire-dark-fantasy/lotr/bilbo.webp";
import v237 from "./grimoire-dark-fantasy/lotr/frodo.webp";
import v238 from "./grimoire-dark-fantasy/norse/odin.webp";
import v239 from "./grimoire-dark-fantasy/norse/thornorse.webp";
import v240 from "./grimoire-dark-fantasy/norse/mimir.webp";
import v241 from "./grimoire-dark-fantasy/norse/brokkr.webp";
import v242 from "./grimoire-dark-fantasy/norse/heimdall.webp";
import v243 from "./grimoire-dark-fantasy/norse/tyr.webp";
import v244 from "./grimoire-dark-fantasy/norse/loki.webp";
import v245 from "./grimoire-dark-fantasy/norse/bragi.webp";
import v246 from "./grimoire-dark-fantasy/olympians/zeus.webp";
import v247 from "./grimoire-dark-fantasy/olympians/ares.webp";
import v248 from "./grimoire-dark-fantasy/olympians/athena.webp";
import v249 from "./grimoire-dark-fantasy/olympians/hephaestus.webp";
import v250 from "./grimoire-dark-fantasy/olympians/apollo.webp";
import v251 from "./grimoire-dark-fantasy/olympians/hades.webp";
import v252 from "./grimoire-dark-fantasy/olympians/dionysus.webp";
import v253 from "./grimoire-dark-fantasy/olympians/hermes.webp";
import v254 from "./grimoire-dark-fantasy/rebels/leia.webp";
import v255 from "./grimoire-dark-fantasy/rebels/hansolo.webp";
import v256 from "./grimoire-dark-fantasy/rebels/obiwan.webp";
import v257 from "./grimoire-dark-fantasy/rebels/luke.webp";
import v258 from "./grimoire-dark-fantasy/rebels/chewbacca.webp";
import v259 from "./grimoire-dark-fantasy/rebels/lando.webp";
import v260 from "./grimoire-dark-fantasy/rebels/c3po.webp";
import v261 from "./grimoire-dark-fantasy/rebels/r2d2.webp";
import v262 from "./grimoire-dark-fantasy/starfleet/picard.webp";
import v263 from "./grimoire-dark-fantasy/starfleet/riker.webp";
import v264 from "./grimoire-dark-fantasy/starfleet/data.webp";
import v265 from "./grimoire-dark-fantasy/starfleet/geordi.webp";
import v266 from "./grimoire-dark-fantasy/starfleet/worf.webp";
import v267 from "./grimoire-dark-fantasy/starfleet/crusher.webp";
import v268 from "./grimoire-dark-fantasy/starfleet/troi.webp";
import v269 from "./grimoire-dark-fantasy/starfleet/wesley.webp";
import v270 from "./grimoire-dark-fantasy/xmen/profx.webp";
import v271 from "./grimoire-dark-fantasy/xmen/cyclops.webp";
import v272 from "./grimoire-dark-fantasy/xmen/beast.webp";
import v273 from "./grimoire-dark-fantasy/xmen/forge.webp";
import v274 from "./grimoire-dark-fantasy/xmen/wolverine.webp";
import v275 from "./grimoire-dark-fantasy/xmen/colossus.webp";
import v276 from "./grimoire-dark-fantasy/xmen/mystique.webp";
import v277 from "./grimoire-dark-fantasy/xmen/nightcrawler.webp";
import v278 from "./grimoire-dark-fantasy/iakaframe/odin.webp";
import v279 from "./grimoire-dark-fantasy/iakaframe/aragorn.webp";
import v280 from "./grimoire-dark-fantasy/iakaframe/gandalf.webp";
import v281 from "./grimoire-dark-fantasy/iakaframe/gimli.webp";
import v282 from "./grimoire-dark-fantasy/iakaframe/legolas.webp";
import v283 from "./grimoire-dark-fantasy/iakaframe/loki.webp";
import v284 from "./grimoire-dark-fantasy/iakaframe/nathalie.webp";
import v285 from "./os-windows/autobots/optimus.webp";
import v286 from "./os-windows/autobots/bumblebee.webp";
import v287 from "./os-windows/autobots/ratchet.webp";
import v288 from "./os-windows/autobots/wheeljack.webp";
import v289 from "./os-windows/autobots/hound.webp";
import v290 from "./os-windows/autobots/ironhide.webp";
import v291 from "./os-windows/autobots/jazz.webp";
import v292 from "./os-windows/autobots/blaster.webp";
import v293 from "./os-windows/avengers/nickfury.webp";
import v294 from "./os-windows/avengers/capamerica.webp";
import v295 from "./os-windows/avengers/strange.webp";
import v296 from "./os-windows/avengers/ironman.webp";
import v297 from "./os-windows/avengers/hawkeye.webp";
import v298 from "./os-windows/avengers/thor.webp";
import v299 from "./os-windows/avengers/lokiavg.webp";
import v300 from "./os-windows/avengers/spiderman.webp";
import v301 from "./os-windows/dc-justice/superman.webp";
import v302 from "./os-windows/dc-justice/batman.webp";
import v303 from "./os-windows/dc-justice/wonderwoman.webp";
import v304 from "./os-windows/dc-justice/cyborg.webp";
import v305 from "./os-windows/dc-justice/greenlantern.webp";
import v306 from "./os-windows/dc-justice/aquaman.webp";
import v307 from "./os-windows/dc-justice/flash.webp";
import v308 from "./os-windows/dc-justice/manhunter.webp";
import v309 from "./os-windows/defenders/daredevil.webp";
import v310 from "./os-windows/defenders/lukecage.webp";
import v311 from "./os-windows/defenders/jessicajones.webp";
import v312 from "./os-windows/defenders/ironfist.webp";
import v313 from "./os-windows/defenders/punisher.webp";
import v314 from "./os-windows/defenders/kingpin.webp";
import v315 from "./os-windows/defenders/elektra.webp";
import v316 from "./os-windows/defenders/foggynelson.webp";
import v317 from "./os-windows/harry-potter/dumbledore.webp";
import v318 from "./os-windows/harry-potter/harry.webp";
import v319 from "./os-windows/harry-potter/mcgonagall.webp";
import v320 from "./os-windows/harry-potter/hagrid.webp";
import v321 from "./os-windows/harry-potter/hermione.webp";
import v322 from "./os-windows/harry-potter/snape.webp";
import v323 from "./os-windows/harry-potter/luna.webp";
import v324 from "./os-windows/harry-potter/ron.webp";
import v325 from "./os-windows/lotr/galadriel.webp";
import v326 from "./os-windows/lotr/aragorn.webp";
import v327 from "./os-windows/lotr/gandalf.webp";
import v328 from "./os-windows/lotr/gimli.webp";
import v329 from "./os-windows/lotr/legolas.webp";
import v330 from "./os-windows/lotr/boromir.webp";
import v331 from "./os-windows/lotr/bilbo.webp";
import v332 from "./os-windows/lotr/frodo.webp";
import v333 from "./os-windows/norse/odin.webp";
import v334 from "./os-windows/norse/thornorse.webp";
import v335 from "./os-windows/norse/mimir.webp";
import v336 from "./os-windows/norse/brokkr.webp";
import v337 from "./os-windows/norse/heimdall.webp";
import v338 from "./os-windows/norse/tyr.webp";
import v339 from "./os-windows/norse/loki.webp";
import v340 from "./os-windows/norse/bragi.webp";
import v341 from "./os-windows/olympians/zeus.webp";
import v342 from "./os-windows/olympians/ares.webp";
import v343 from "./os-windows/olympians/athena.webp";
import v344 from "./os-windows/olympians/hephaestus.webp";
import v345 from "./os-windows/olympians/apollo.webp";
import v346 from "./os-windows/olympians/hades.webp";
import v347 from "./os-windows/olympians/dionysus.webp";
import v348 from "./os-windows/olympians/hermes.webp";
import v349 from "./os-windows/rebels/leia.webp";
import v350 from "./os-windows/rebels/hansolo.webp";
import v351 from "./os-windows/rebels/obiwan.webp";
import v352 from "./os-windows/rebels/luke.webp";
import v353 from "./os-windows/rebels/chewbacca.webp";
import v354 from "./os-windows/rebels/lando.webp";
import v355 from "./os-windows/rebels/c3po.webp";
import v356 from "./os-windows/rebels/r2d2.webp";
import v357 from "./os-windows/starfleet/picard.webp";
import v358 from "./os-windows/starfleet/riker.webp";
import v359 from "./os-windows/starfleet/data.webp";
import v360 from "./os-windows/starfleet/geordi.webp";
import v361 from "./os-windows/starfleet/worf.webp";
import v362 from "./os-windows/starfleet/crusher.webp";
import v363 from "./os-windows/starfleet/troi.webp";
import v364 from "./os-windows/starfleet/wesley.webp";
import v365 from "./os-windows/xmen/profx.webp";
import v366 from "./os-windows/xmen/cyclops.webp";
import v367 from "./os-windows/xmen/beast.webp";
import v368 from "./os-windows/xmen/forge.webp";
import v369 from "./os-windows/xmen/wolverine.webp";
import v370 from "./os-windows/xmen/colossus.webp";
import v371 from "./os-windows/xmen/mystique.webp";
import v372 from "./os-windows/xmen/nightcrawler.webp";
import v373 from "./os-windows/iakaframe/odin.webp";
import v374 from "./os-windows/iakaframe/aragorn.webp";
import v375 from "./os-windows/iakaframe/gandalf.webp";
import v376 from "./os-windows/iakaframe/gimli.webp";
import v377 from "./os-windows/iakaframe/legolas.webp";
import v378 from "./os-windows/iakaframe/loki.webp";
import v379 from "./os-windows/iakaframe/nathalie.webp";
import v380 from "./os-ubuntu/autobots/optimus.webp";
import v381 from "./os-ubuntu/autobots/bumblebee.webp";
import v382 from "./os-ubuntu/autobots/ratchet.webp";
import v383 from "./os-ubuntu/autobots/wheeljack.webp";
import v384 from "./os-ubuntu/autobots/hound.webp";
import v385 from "./os-ubuntu/autobots/ironhide.webp";
import v386 from "./os-ubuntu/autobots/jazz.webp";
import v387 from "./os-ubuntu/autobots/blaster.webp";
import v388 from "./os-ubuntu/avengers/nickfury.webp";
import v389 from "./os-ubuntu/avengers/capamerica.webp";
import v390 from "./os-ubuntu/avengers/strange.webp";
import v391 from "./os-ubuntu/avengers/ironman.webp";
import v392 from "./os-ubuntu/avengers/hawkeye.webp";
import v393 from "./os-ubuntu/avengers/thor.webp";
import v394 from "./os-ubuntu/avengers/lokiavg.webp";
import v395 from "./os-ubuntu/avengers/spiderman.webp";
import v396 from "./os-ubuntu/dc-justice/superman.webp";
import v397 from "./os-ubuntu/dc-justice/batman.webp";
import v398 from "./os-ubuntu/dc-justice/wonderwoman.webp";
import v399 from "./os-ubuntu/dc-justice/cyborg.webp";
import v400 from "./os-ubuntu/dc-justice/greenlantern.webp";
import v401 from "./os-ubuntu/dc-justice/aquaman.webp";
import v402 from "./os-ubuntu/dc-justice/flash.webp";
import v403 from "./os-ubuntu/dc-justice/manhunter.webp";
import v404 from "./os-ubuntu/defenders/daredevil.webp";
import v405 from "./os-ubuntu/defenders/lukecage.webp";
import v406 from "./os-ubuntu/defenders/jessicajones.webp";
import v407 from "./os-ubuntu/defenders/ironfist.webp";
import v408 from "./os-ubuntu/defenders/punisher.webp";
import v409 from "./os-ubuntu/defenders/kingpin.webp";
import v410 from "./os-ubuntu/defenders/elektra.webp";
import v411 from "./os-ubuntu/defenders/foggynelson.webp";
import v412 from "./os-ubuntu/harry-potter/dumbledore.webp";
import v413 from "./os-ubuntu/harry-potter/harry.webp";
import v414 from "./os-ubuntu/harry-potter/mcgonagall.webp";
import v415 from "./os-ubuntu/harry-potter/hagrid.webp";
import v416 from "./os-ubuntu/harry-potter/hermione.webp";
import v417 from "./os-ubuntu/harry-potter/snape.webp";
import v418 from "./os-ubuntu/harry-potter/luna.webp";
import v419 from "./os-ubuntu/harry-potter/ron.webp";
import v420 from "./os-ubuntu/lotr/galadriel.webp";
import v421 from "./os-ubuntu/lotr/aragorn.webp";
import v422 from "./os-ubuntu/lotr/gandalf.webp";
import v423 from "./os-ubuntu/lotr/gimli.webp";
import v424 from "./os-ubuntu/lotr/legolas.webp";
import v425 from "./os-ubuntu/lotr/boromir.webp";
import v426 from "./os-ubuntu/lotr/bilbo.webp";
import v427 from "./os-ubuntu/lotr/frodo.webp";
import v428 from "./os-ubuntu/norse/odin.webp";
import v429 from "./os-ubuntu/norse/thornorse.webp";
import v430 from "./os-ubuntu/norse/mimir.webp";
import v431 from "./os-ubuntu/norse/brokkr.webp";
import v432 from "./os-ubuntu/norse/heimdall.webp";
import v433 from "./os-ubuntu/norse/tyr.webp";
import v434 from "./os-ubuntu/norse/loki.webp";
import v435 from "./os-ubuntu/norse/bragi.webp";
import v436 from "./os-ubuntu/olympians/zeus.webp";
import v437 from "./os-ubuntu/olympians/ares.webp";
import v438 from "./os-ubuntu/olympians/athena.webp";
import v439 from "./os-ubuntu/olympians/hephaestus.webp";
import v440 from "./os-ubuntu/olympians/apollo.webp";
import v441 from "./os-ubuntu/olympians/hades.webp";
import v442 from "./os-ubuntu/olympians/dionysus.webp";
import v443 from "./os-ubuntu/olympians/hermes.webp";
import v444 from "./os-ubuntu/rebels/leia.webp";
import v445 from "./os-ubuntu/rebels/hansolo.webp";
import v446 from "./os-ubuntu/rebels/obiwan.webp";
import v447 from "./os-ubuntu/rebels/luke.webp";
import v448 from "./os-ubuntu/rebels/chewbacca.webp";
import v449 from "./os-ubuntu/rebels/lando.webp";
import v450 from "./os-ubuntu/rebels/c3po.webp";
import v451 from "./os-ubuntu/rebels/r2d2.webp";
import v452 from "./os-ubuntu/starfleet/picard.webp";
import v453 from "./os-ubuntu/starfleet/riker.webp";
import v454 from "./os-ubuntu/starfleet/data.webp";
import v455 from "./os-ubuntu/starfleet/geordi.webp";
import v456 from "./os-ubuntu/starfleet/worf.webp";
import v457 from "./os-ubuntu/starfleet/crusher.webp";
import v458 from "./os-ubuntu/starfleet/troi.webp";
import v459 from "./os-ubuntu/starfleet/wesley.webp";
import v460 from "./os-ubuntu/xmen/profx.webp";
import v461 from "./os-ubuntu/xmen/cyclops.webp";
import v462 from "./os-ubuntu/xmen/beast.webp";
import v463 from "./os-ubuntu/xmen/forge.webp";
import v464 from "./os-ubuntu/xmen/wolverine.webp";
import v465 from "./os-ubuntu/xmen/colossus.webp";
import v466 from "./os-ubuntu/xmen/mystique.webp";
import v467 from "./os-ubuntu/xmen/nightcrawler.webp";
import v468 from "./os-ubuntu/iakaframe/odin.webp";
import v469 from "./os-ubuntu/iakaframe/aragorn.webp";
import v470 from "./os-ubuntu/iakaframe/gandalf.webp";
import v471 from "./os-ubuntu/iakaframe/gimli.webp";
import v472 from "./os-ubuntu/iakaframe/legolas.webp";
import v473 from "./os-ubuntu/iakaframe/loki.webp";
import v474 from "./os-ubuntu/iakaframe/nathalie.webp";
import v475 from "./os-android/autobots/optimus.webp";
import v476 from "./os-android/autobots/bumblebee.webp";
import v477 from "./os-android/autobots/ratchet.webp";
import v478 from "./os-android/autobots/wheeljack.webp";
import v479 from "./os-android/autobots/hound.webp";
import v480 from "./os-android/autobots/ironhide.webp";
import v481 from "./os-android/autobots/jazz.webp";
import v482 from "./os-android/autobots/blaster.webp";
import v483 from "./os-android/avengers/nickfury.webp";
import v484 from "./os-android/avengers/capamerica.webp";
import v485 from "./os-android/avengers/strange.webp";
import v486 from "./os-android/avengers/ironman.webp";
import v487 from "./os-android/avengers/hawkeye.webp";
import v488 from "./os-android/avengers/thor.webp";
import v489 from "./os-android/avengers/lokiavg.webp";
import v490 from "./os-android/avengers/spiderman.webp";
import v491 from "./os-android/dc-justice/superman.webp";
import v492 from "./os-android/dc-justice/batman.webp";
import v493 from "./os-android/dc-justice/wonderwoman.webp";
import v494 from "./os-android/dc-justice/cyborg.webp";
import v495 from "./os-android/dc-justice/greenlantern.webp";
import v496 from "./os-android/dc-justice/aquaman.webp";
import v497 from "./os-android/dc-justice/flash.webp";
import v498 from "./os-android/dc-justice/manhunter.webp";
import v499 from "./os-android/defenders/daredevil.webp";
import v500 from "./os-android/defenders/lukecage.webp";
import v501 from "./os-android/defenders/jessicajones.webp";
import v502 from "./os-android/defenders/ironfist.webp";
import v503 from "./os-android/defenders/punisher.webp";
import v504 from "./os-android/defenders/kingpin.webp";
import v505 from "./os-android/defenders/elektra.webp";
import v506 from "./os-android/defenders/foggynelson.webp";
import v507 from "./os-android/harry-potter/dumbledore.webp";
import v508 from "./os-android/harry-potter/harry.webp";
import v509 from "./os-android/harry-potter/mcgonagall.webp";
import v510 from "./os-android/harry-potter/hagrid.webp";
import v511 from "./os-android/harry-potter/hermione.webp";
import v512 from "./os-android/harry-potter/snape.webp";
import v513 from "./os-android/harry-potter/luna.webp";
import v514 from "./os-android/harry-potter/ron.webp";
import v515 from "./os-android/lotr/galadriel.webp";
import v516 from "./os-android/lotr/aragorn.webp";
import v517 from "./os-android/lotr/gandalf.webp";
import v518 from "./os-android/lotr/gimli.webp";
import v519 from "./os-android/lotr/legolas.webp";
import v520 from "./os-android/lotr/boromir.webp";
import v521 from "./os-android/lotr/bilbo.webp";
import v522 from "./os-android/lotr/frodo.webp";
import v523 from "./os-android/norse/odin.webp";
import v524 from "./os-android/norse/thornorse.webp";
import v525 from "./os-android/norse/mimir.webp";
import v526 from "./os-android/norse/brokkr.webp";
import v527 from "./os-android/norse/heimdall.webp";
import v528 from "./os-android/norse/tyr.webp";
import v529 from "./os-android/norse/loki.webp";
import v530 from "./os-android/norse/bragi.webp";
import v531 from "./os-android/olympians/zeus.webp";
import v532 from "./os-android/olympians/ares.webp";
import v533 from "./os-android/olympians/athena.webp";
import v534 from "./os-android/olympians/hephaestus.webp";
import v535 from "./os-android/olympians/apollo.webp";
import v536 from "./os-android/olympians/hades.webp";
import v537 from "./os-android/olympians/dionysus.webp";
import v538 from "./os-android/olympians/hermes.webp";
import v539 from "./os-android/rebels/leia.webp";
import v540 from "./os-android/rebels/hansolo.webp";
import v541 from "./os-android/rebels/obiwan.webp";
import v542 from "./os-android/rebels/luke.webp";
import v543 from "./os-android/rebels/chewbacca.webp";
import v544 from "./os-android/rebels/lando.webp";
import v545 from "./os-android/rebels/c3po.webp";
import v546 from "./os-android/rebels/r2d2.webp";
import v547 from "./os-android/starfleet/picard.webp";
import v548 from "./os-android/starfleet/riker.webp";
import v549 from "./os-android/starfleet/data.webp";
import v550 from "./os-android/starfleet/geordi.webp";
import v551 from "./os-android/starfleet/worf.webp";
import v552 from "./os-android/starfleet/crusher.webp";
import v553 from "./os-android/starfleet/troi.webp";
import v554 from "./os-android/starfleet/wesley.webp";
import v555 from "./os-android/xmen/profx.webp";
import v556 from "./os-android/xmen/cyclops.webp";
import v557 from "./os-android/xmen/beast.webp";
import v558 from "./os-android/xmen/forge.webp";
import v559 from "./os-android/xmen/wolverine.webp";
import v560 from "./os-android/xmen/colossus.webp";
import v561 from "./os-android/xmen/mystique.webp";
import v562 from "./os-android/xmen/nightcrawler.webp";
import v563 from "./os-android/iakaframe/odin.webp";
import v564 from "./os-android/iakaframe/aragorn.webp";
import v565 from "./os-android/iakaframe/gandalf.webp";
import v566 from "./os-android/iakaframe/gimli.webp";
import v567 from "./os-android/iakaframe/legolas.webp";
import v568 from "./os-android/iakaframe/loki.webp";
import v569 from "./os-android/iakaframe/nathalie.webp";
import v570 from "./os-macos/autobots/optimus.webp";
import v571 from "./os-macos/autobots/bumblebee.webp";
import v572 from "./os-macos/autobots/ratchet.webp";
import v573 from "./os-macos/autobots/wheeljack.webp";
import v574 from "./os-macos/autobots/hound.webp";
import v575 from "./os-macos/autobots/ironhide.webp";
import v576 from "./os-macos/autobots/jazz.webp";
import v577 from "./os-macos/autobots/blaster.webp";
import v578 from "./os-macos/avengers/nickfury.webp";
import v579 from "./os-macos/avengers/capamerica.webp";
import v580 from "./os-macos/avengers/strange.webp";
import v581 from "./os-macos/avengers/ironman.webp";
import v582 from "./os-macos/avengers/hawkeye.webp";
import v583 from "./os-macos/avengers/thor.webp";
import v584 from "./os-macos/avengers/lokiavg.webp";
import v585 from "./os-macos/avengers/spiderman.webp";
import v586 from "./os-macos/dc-justice/superman.webp";
import v587 from "./os-macos/dc-justice/batman.webp";
import v588 from "./os-macos/dc-justice/wonderwoman.webp";
import v589 from "./os-macos/dc-justice/cyborg.webp";
import v590 from "./os-macos/dc-justice/greenlantern.webp";
import v591 from "./os-macos/dc-justice/aquaman.webp";
import v592 from "./os-macos/dc-justice/flash.webp";
import v593 from "./os-macos/dc-justice/manhunter.webp";
import v594 from "./os-macos/defenders/daredevil.webp";
import v595 from "./os-macos/defenders/lukecage.webp";
import v596 from "./os-macos/defenders/jessicajones.webp";
import v597 from "./os-macos/defenders/ironfist.webp";
import v598 from "./os-macos/defenders/punisher.webp";
import v599 from "./os-macos/defenders/kingpin.webp";
import v600 from "./os-macos/defenders/elektra.webp";
import v601 from "./os-macos/defenders/foggynelson.webp";
import v602 from "./os-macos/harry-potter/dumbledore.webp";
import v603 from "./os-macos/harry-potter/harry.webp";
import v604 from "./os-macos/harry-potter/mcgonagall.webp";
import v605 from "./os-macos/harry-potter/hagrid.webp";
import v606 from "./os-macos/harry-potter/hermione.webp";
import v607 from "./os-macos/harry-potter/snape.webp";
import v608 from "./os-macos/harry-potter/luna.webp";
import v609 from "./os-macos/harry-potter/ron.webp";
import v610 from "./os-macos/lotr/galadriel.webp";
import v611 from "./os-macos/lotr/aragorn.webp";
import v612 from "./os-macos/lotr/gandalf.webp";
import v613 from "./os-macos/lotr/gimli.webp";
import v614 from "./os-macos/lotr/legolas.webp";
import v615 from "./os-macos/lotr/boromir.webp";
import v616 from "./os-macos/lotr/bilbo.webp";
import v617 from "./os-macos/lotr/frodo.webp";
import v618 from "./os-macos/norse/odin.webp";
import v619 from "./os-macos/norse/thornorse.webp";
import v620 from "./os-macos/norse/mimir.webp";
import v621 from "./os-macos/norse/brokkr.webp";
import v622 from "./os-macos/norse/heimdall.webp";
import v623 from "./os-macos/norse/tyr.webp";
import v624 from "./os-macos/norse/loki.webp";
import v625 from "./os-macos/norse/bragi.webp";
import v626 from "./os-macos/olympians/zeus.webp";
import v627 from "./os-macos/olympians/ares.webp";
import v628 from "./os-macos/olympians/athena.webp";
import v629 from "./os-macos/olympians/hephaestus.webp";
import v630 from "./os-macos/olympians/apollo.webp";
import v631 from "./os-macos/olympians/hades.webp";
import v632 from "./os-macos/olympians/dionysus.webp";
import v633 from "./os-macos/olympians/hermes.webp";
import v634 from "./os-macos/rebels/leia.webp";
import v635 from "./os-macos/rebels/hansolo.webp";
import v636 from "./os-macos/rebels/obiwan.webp";
import v637 from "./os-macos/rebels/luke.webp";
import v638 from "./os-macos/rebels/chewbacca.webp";
import v639 from "./os-macos/rebels/lando.webp";
import v640 from "./os-macos/rebels/c3po.webp";
import v641 from "./os-macos/rebels/r2d2.webp";
import v642 from "./os-macos/starfleet/picard.webp";
import v643 from "./os-macos/starfleet/riker.webp";
import v644 from "./os-macos/starfleet/data.webp";
import v645 from "./os-macos/starfleet/geordi.webp";
import v646 from "./os-macos/starfleet/worf.webp";
import v647 from "./os-macos/starfleet/crusher.webp";
import v648 from "./os-macos/starfleet/troi.webp";
import v649 from "./os-macos/starfleet/wesley.webp";
import v650 from "./os-macos/xmen/profx.webp";
import v651 from "./os-macos/xmen/cyclops.webp";
import v652 from "./os-macos/xmen/beast.webp";
import v653 from "./os-macos/xmen/forge.webp";
import v654 from "./os-macos/xmen/wolverine.webp";
import v655 from "./os-macos/xmen/colossus.webp";
import v656 from "./os-macos/xmen/mystique.webp";
import v657 from "./os-macos/xmen/nightcrawler.webp";
import v658 from "./os-macos/iakaframe/odin.webp";
import v659 from "./os-macos/iakaframe/aragorn.webp";
import v660 from "./os-macos/iakaframe/gandalf.webp";
import v661 from "./os-macos/iakaframe/gimli.webp";
import v662 from "./os-macos/iakaframe/legolas.webp";
import v663 from "./os-macos/iakaframe/loki.webp";
import v664 from "./os-macos/iakaframe/nathalie.webp";
import v665 from "./cartoon-std/autobots/optimus.webp";
import v666 from "./cartoon-std/autobots/bumblebee.webp";
import v667 from "./cartoon-std/autobots/ratchet.webp";
import v668 from "./cartoon-std/autobots/wheeljack.webp";
import v669 from "./cartoon-std/autobots/hound.webp";
import v670 from "./cartoon-std/autobots/ironhide.webp";
import v671 from "./cartoon-std/autobots/jazz.webp";
import v672 from "./cartoon-std/autobots/blaster.webp";
import v673 from "./cartoon-std/avengers/nickfury.webp";
import v674 from "./cartoon-std/avengers/capamerica.webp";
import v675 from "./cartoon-std/avengers/strange.webp";
import v676 from "./cartoon-std/avengers/ironman.webp";
import v677 from "./cartoon-std/avengers/hawkeye.webp";
import v678 from "./cartoon-std/avengers/thor.webp";
import v679 from "./cartoon-std/avengers/lokiavg.webp";
import v680 from "./cartoon-std/avengers/spiderman.webp";
import v681 from "./cartoon-std/dc-justice/superman.webp";
import v682 from "./cartoon-std/dc-justice/batman.webp";
import v683 from "./cartoon-std/dc-justice/wonderwoman.webp";
import v684 from "./cartoon-std/dc-justice/cyborg.webp";
import v685 from "./cartoon-std/dc-justice/greenlantern.webp";
import v686 from "./cartoon-std/dc-justice/aquaman.webp";
import v687 from "./cartoon-std/dc-justice/flash.webp";
import v688 from "./cartoon-std/dc-justice/manhunter.webp";
import v689 from "./cartoon-std/defenders/daredevil.webp";
import v690 from "./cartoon-std/defenders/lukecage.webp";
import v691 from "./cartoon-std/defenders/jessicajones.webp";
import v692 from "./cartoon-std/defenders/ironfist.webp";
import v693 from "./cartoon-std/defenders/punisher.webp";
import v694 from "./cartoon-std/defenders/kingpin.webp";
import v695 from "./cartoon-std/defenders/elektra.webp";
import v696 from "./cartoon-std/defenders/foggynelson.webp";
import v697 from "./cartoon-std/harry-potter/dumbledore.webp";
import v698 from "./cartoon-std/harry-potter/harry.webp";
import v699 from "./cartoon-std/harry-potter/mcgonagall.webp";
import v700 from "./cartoon-std/harry-potter/hagrid.webp";
import v701 from "./cartoon-std/harry-potter/hermione.webp";
import v702 from "./cartoon-std/harry-potter/snape.webp";
import v703 from "./cartoon-std/harry-potter/luna.webp";
import v704 from "./cartoon-std/harry-potter/ron.webp";
import v705 from "./cartoon-std/lotr/galadriel.webp";
import v706 from "./cartoon-std/lotr/aragorn.webp";
import v707 from "./cartoon-std/lotr/gandalf.webp";
import v708 from "./cartoon-std/lotr/gimli.webp";
import v709 from "./cartoon-std/lotr/legolas.webp";
import v710 from "./cartoon-std/lotr/boromir.webp";
import v711 from "./cartoon-std/lotr/bilbo.webp";
import v712 from "./cartoon-std/lotr/frodo.webp";
import v713 from "./cartoon-std/norse/odin.webp";
import v714 from "./cartoon-std/norse/thornorse.webp";
import v715 from "./cartoon-std/norse/mimir.webp";
import v716 from "./cartoon-std/norse/brokkr.webp";
import v717 from "./cartoon-std/norse/heimdall.webp";
import v718 from "./cartoon-std/norse/tyr.webp";
import v719 from "./cartoon-std/norse/loki.webp";
import v720 from "./cartoon-std/norse/bragi.webp";
import v721 from "./cartoon-std/olympians/zeus.webp";
import v722 from "./cartoon-std/olympians/ares.webp";
import v723 from "./cartoon-std/olympians/athena.webp";
import v724 from "./cartoon-std/olympians/hephaestus.webp";
import v725 from "./cartoon-std/olympians/apollo.webp";
import v726 from "./cartoon-std/olympians/hades.webp";
import v727 from "./cartoon-std/olympians/dionysus.webp";
import v728 from "./cartoon-std/olympians/hermes.webp";
import v729 from "./cartoon-std/rebels/leia.webp";
import v730 from "./cartoon-std/rebels/hansolo.webp";
import v731 from "./cartoon-std/rebels/obiwan.webp";
import v732 from "./cartoon-std/rebels/luke.webp";
import v733 from "./cartoon-std/rebels/chewbacca.webp";
import v734 from "./cartoon-std/rebels/lando.webp";
import v735 from "./cartoon-std/rebels/c3po.webp";
import v736 from "./cartoon-std/rebels/r2d2.webp";
import v737 from "./cartoon-std/starfleet/picard.webp";
import v738 from "./cartoon-std/starfleet/riker.webp";
import v739 from "./cartoon-std/starfleet/data.webp";
import v740 from "./cartoon-std/starfleet/geordi.webp";
import v741 from "./cartoon-std/starfleet/worf.webp";
import v742 from "./cartoon-std/starfleet/crusher.webp";
import v743 from "./cartoon-std/starfleet/troi.webp";
import v744 from "./cartoon-std/starfleet/wesley.webp";
import v745 from "./cartoon-std/xmen/profx.webp";
import v746 from "./cartoon-std/xmen/cyclops.webp";
import v747 from "./cartoon-std/xmen/beast.webp";
import v748 from "./cartoon-std/xmen/forge.webp";
import v749 from "./cartoon-std/xmen/wolverine.webp";
import v750 from "./cartoon-std/xmen/colossus.webp";
import v751 from "./cartoon-std/xmen/mystique.webp";
import v752 from "./cartoon-std/xmen/nightcrawler.webp";
import v753 from "./cartoon-std/iakaframe/odin.webp";
import v754 from "./cartoon-std/iakaframe/aragorn.webp";
import v755 from "./cartoon-std/iakaframe/gandalf.webp";
import v756 from "./cartoon-std/iakaframe/gimli.webp";
import v757 from "./cartoon-std/iakaframe/legolas.webp";
import v758 from "./cartoon-std/iakaframe/loki.webp";
import v759 from "./cartoon-std/iakaframe/nathalie.webp";
import v760 from "./photoreal-modern/autobots/optimus.webp";
import v761 from "./photoreal-modern/autobots/bumblebee.webp";
import v762 from "./photoreal-modern/autobots/ratchet.webp";
import v763 from "./photoreal-modern/autobots/wheeljack.webp";
import v764 from "./photoreal-modern/autobots/hound.webp";
import v765 from "./photoreal-modern/autobots/ironhide.webp";
import v766 from "./photoreal-modern/autobots/jazz.webp";
import v767 from "./photoreal-modern/autobots/blaster.webp";
import v768 from "./photoreal-modern/avengers/nickfury.webp";
import v769 from "./photoreal-modern/avengers/capamerica.webp";
import v770 from "./photoreal-modern/avengers/strange.webp";
import v771 from "./photoreal-modern/avengers/ironman.webp";
import v772 from "./photoreal-modern/avengers/hawkeye.webp";
import v773 from "./photoreal-modern/avengers/thor.webp";
import v774 from "./photoreal-modern/avengers/lokiavg.webp";
import v775 from "./photoreal-modern/avengers/spiderman.webp";
import v776 from "./photoreal-modern/dc-justice/superman.webp";
import v777 from "./photoreal-modern/dc-justice/batman.webp";
import v778 from "./photoreal-modern/dc-justice/wonderwoman.webp";
import v779 from "./photoreal-modern/dc-justice/cyborg.webp";
import v780 from "./photoreal-modern/dc-justice/greenlantern.webp";
import v781 from "./photoreal-modern/dc-justice/aquaman.webp";
import v782 from "./photoreal-modern/dc-justice/flash.webp";
import v783 from "./photoreal-modern/dc-justice/manhunter.webp";
import v784 from "./photoreal-modern/defenders/daredevil.webp";
import v785 from "./photoreal-modern/defenders/lukecage.webp";
import v786 from "./photoreal-modern/defenders/jessicajones.webp";
import v787 from "./photoreal-modern/defenders/ironfist.webp";
import v788 from "./photoreal-modern/defenders/punisher.webp";
import v789 from "./photoreal-modern/defenders/kingpin.webp";
import v790 from "./photoreal-modern/defenders/elektra.webp";
import v791 from "./photoreal-modern/defenders/foggynelson.webp";
import v792 from "./photoreal-modern/harry-potter/dumbledore.webp";
import v793 from "./photoreal-modern/harry-potter/harry.webp";
import v794 from "./photoreal-modern/harry-potter/mcgonagall.webp";
import v795 from "./photoreal-modern/harry-potter/hagrid.webp";
import v796 from "./photoreal-modern/harry-potter/hermione.webp";
import v797 from "./photoreal-modern/harry-potter/snape.webp";
import v798 from "./photoreal-modern/harry-potter/luna.webp";
import v799 from "./photoreal-modern/harry-potter/ron.webp";
import v800 from "./photoreal-modern/lotr/galadriel.webp";
import v801 from "./photoreal-modern/lotr/aragorn.webp";
import v802 from "./photoreal-modern/lotr/gandalf.webp";
import v803 from "./photoreal-modern/lotr/gimli.webp";
import v804 from "./photoreal-modern/lotr/legolas.webp";
import v805 from "./photoreal-modern/lotr/boromir.webp";
import v806 from "./photoreal-modern/lotr/bilbo.webp";
import v807 from "./photoreal-modern/lotr/frodo.webp";
import v808 from "./photoreal-modern/norse/odin.webp";
import v809 from "./photoreal-modern/norse/thornorse.webp";
import v810 from "./photoreal-modern/norse/mimir.webp";
import v811 from "./photoreal-modern/norse/brokkr.webp";
import v812 from "./photoreal-modern/norse/heimdall.webp";
import v813 from "./photoreal-modern/norse/tyr.webp";
import v814 from "./photoreal-modern/norse/loki.webp";
import v815 from "./photoreal-modern/norse/bragi.webp";
import v816 from "./photoreal-modern/olympians/zeus.webp";
import v817 from "./photoreal-modern/olympians/ares.webp";
import v818 from "./photoreal-modern/olympians/athena.webp";
import v819 from "./photoreal-modern/olympians/hephaestus.webp";
import v820 from "./photoreal-modern/olympians/apollo.webp";
import v821 from "./photoreal-modern/olympians/hades.webp";
import v822 from "./photoreal-modern/olympians/dionysus.webp";
import v823 from "./photoreal-modern/olympians/hermes.webp";
import v824 from "./photoreal-modern/rebels/leia.webp";
import v825 from "./photoreal-modern/rebels/hansolo.webp";
import v826 from "./photoreal-modern/rebels/obiwan.webp";
import v827 from "./photoreal-modern/rebels/luke.webp";
import v828 from "./photoreal-modern/rebels/chewbacca.webp";
import v829 from "./photoreal-modern/rebels/lando.webp";
import v830 from "./photoreal-modern/rebels/c3po.webp";
import v831 from "./photoreal-modern/rebels/r2d2.webp";
import v832 from "./photoreal-modern/starfleet/picard.webp";
import v833 from "./photoreal-modern/starfleet/riker.webp";
import v834 from "./photoreal-modern/starfleet/data.webp";
import v835 from "./photoreal-modern/starfleet/geordi.webp";
import v836 from "./photoreal-modern/starfleet/worf.webp";
import v837 from "./photoreal-modern/starfleet/crusher.webp";
import v838 from "./photoreal-modern/starfleet/troi.webp";
import v839 from "./photoreal-modern/starfleet/wesley.webp";
import v840 from "./photoreal-modern/xmen/profx.webp";
import v841 from "./photoreal-modern/xmen/cyclops.webp";
import v842 from "./photoreal-modern/xmen/beast.webp";
import v843 from "./photoreal-modern/xmen/forge.webp";
import v844 from "./photoreal-modern/xmen/wolverine.webp";
import v845 from "./photoreal-modern/xmen/colossus.webp";
import v846 from "./photoreal-modern/xmen/mystique.webp";
import v847 from "./photoreal-modern/xmen/nightcrawler.webp";
import v848 from "./photoreal-modern/iakaframe/odin.webp";
import v849 from "./photoreal-modern/iakaframe/aragorn.webp";
import v850 from "./photoreal-modern/iakaframe/gandalf.webp";
import v851 from "./photoreal-modern/iakaframe/gimli.webp";
import v852 from "./photoreal-modern/iakaframe/legolas.webp";
import v853 from "./photoreal-modern/iakaframe/loki.webp";
import v854 from "./photoreal-modern/iakaframe/nathalie.webp";
import v855 from "./studio-clair/autobots/optimus.webp";
import v856 from "./studio-clair/autobots/bumblebee.webp";
import v857 from "./studio-clair/autobots/ratchet.webp";
import v858 from "./studio-clair/autobots/wheeljack.webp";
import v859 from "./studio-clair/autobots/hound.webp";
import v860 from "./studio-clair/autobots/ironhide.webp";
import v861 from "./studio-clair/autobots/jazz.webp";
import v862 from "./studio-clair/autobots/blaster.webp";
import v863 from "./studio-clair/avengers/nickfury.webp";
import v864 from "./studio-clair/avengers/capamerica.webp";
import v865 from "./studio-clair/avengers/strange.webp";
import v866 from "./studio-clair/avengers/ironman.webp";
import v867 from "./studio-clair/avengers/hawkeye.webp";
import v868 from "./studio-clair/avengers/thor.webp";
import v869 from "./studio-clair/avengers/lokiavg.webp";
import v870 from "./studio-clair/avengers/spiderman.webp";
import v871 from "./studio-clair/dc-justice/superman.webp";
import v872 from "./studio-clair/dc-justice/batman.webp";
import v873 from "./studio-clair/dc-justice/wonderwoman.webp";
import v874 from "./studio-clair/dc-justice/cyborg.webp";
import v875 from "./studio-clair/dc-justice/greenlantern.webp";
import v876 from "./studio-clair/dc-justice/aquaman.webp";
import v877 from "./studio-clair/dc-justice/flash.webp";
import v878 from "./studio-clair/dc-justice/manhunter.webp";
import v879 from "./studio-clair/defenders/daredevil.webp";
import v880 from "./studio-clair/defenders/lukecage.webp";
import v881 from "./studio-clair/defenders/jessicajones.webp";
import v882 from "./studio-clair/defenders/ironfist.webp";
import v883 from "./studio-clair/defenders/punisher.webp";
import v884 from "./studio-clair/defenders/kingpin.webp";
import v885 from "./studio-clair/defenders/elektra.webp";
import v886 from "./studio-clair/defenders/foggynelson.webp";
import v887 from "./studio-clair/harry-potter/dumbledore.webp";
import v888 from "./studio-clair/harry-potter/harry.webp";
import v889 from "./studio-clair/harry-potter/mcgonagall.webp";
import v890 from "./studio-clair/harry-potter/hagrid.webp";
import v891 from "./studio-clair/harry-potter/hermione.webp";
import v892 from "./studio-clair/harry-potter/snape.webp";
import v893 from "./studio-clair/harry-potter/luna.webp";
import v894 from "./studio-clair/harry-potter/ron.webp";
import v895 from "./studio-clair/lotr/galadriel.webp";
import v896 from "./studio-clair/lotr/aragorn.webp";
import v897 from "./studio-clair/lotr/gandalf.webp";
import v898 from "./studio-clair/lotr/gimli.webp";
import v899 from "./studio-clair/lotr/legolas.webp";
import v900 from "./studio-clair/lotr/boromir.webp";
import v901 from "./studio-clair/lotr/bilbo.webp";
import v902 from "./studio-clair/lotr/frodo.webp";
import v903 from "./studio-clair/norse/odin.webp";
import v904 from "./studio-clair/norse/thornorse.webp";
import v905 from "./studio-clair/norse/mimir.webp";
import v906 from "./studio-clair/norse/brokkr.webp";
import v907 from "./studio-clair/norse/heimdall.webp";
import v908 from "./studio-clair/norse/tyr.webp";
import v909 from "./studio-clair/norse/loki.webp";
import v910 from "./studio-clair/norse/bragi.webp";
import v911 from "./studio-clair/olympians/zeus.webp";
import v912 from "./studio-clair/olympians/ares.webp";
import v913 from "./studio-clair/olympians/athena.webp";
import v914 from "./studio-clair/olympians/hephaestus.webp";
import v915 from "./studio-clair/olympians/apollo.webp";
import v916 from "./studio-clair/olympians/hades.webp";
import v917 from "./studio-clair/olympians/dionysus.webp";
import v918 from "./studio-clair/olympians/hermes.webp";
import v919 from "./studio-clair/rebels/leia.webp";
import v920 from "./studio-clair/rebels/hansolo.webp";
import v921 from "./studio-clair/rebels/obiwan.webp";
import v922 from "./studio-clair/rebels/luke.webp";
import v923 from "./studio-clair/rebels/chewbacca.webp";
import v924 from "./studio-clair/rebels/lando.webp";
import v925 from "./studio-clair/rebels/c3po.webp";
import v926 from "./studio-clair/rebels/r2d2.webp";
import v927 from "./studio-clair/starfleet/picard.webp";
import v928 from "./studio-clair/starfleet/riker.webp";
import v929 from "./studio-clair/starfleet/data.webp";
import v930 from "./studio-clair/starfleet/geordi.webp";
import v931 from "./studio-clair/starfleet/worf.webp";
import v932 from "./studio-clair/starfleet/crusher.webp";
import v933 from "./studio-clair/starfleet/troi.webp";
import v934 from "./studio-clair/starfleet/wesley.webp";
import v935 from "./studio-clair/xmen/profx.webp";
import v936 from "./studio-clair/xmen/cyclops.webp";
import v937 from "./studio-clair/xmen/beast.webp";
import v938 from "./studio-clair/xmen/forge.webp";
import v939 from "./studio-clair/xmen/wolverine.webp";
import v940 from "./studio-clair/xmen/colossus.webp";
import v941 from "./studio-clair/xmen/mystique.webp";
import v942 from "./studio-clair/xmen/nightcrawler.webp";

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
    },
  },
  "naonedge-light": {
    "autobots": {
      0: v95,
      1: v96,
      2: v97,
      3: v98,
      4: v99,
      5: v100,
      6: v101,
      7: v102,
    },
    "avengers": {
      0: v103,
      1: v104,
      2: v105,
      3: v106,
      4: v107,
      5: v108,
      6: v109,
      7: v110,
    },
    "dc-justice": {
      0: v111,
      1: v112,
      2: v113,
      3: v114,
      4: v115,
      5: v116,
      6: v117,
      7: v118,
    },
    "defenders": {
      0: v119,
      1: v120,
      2: v121,
      3: v122,
      4: v123,
      5: v124,
      6: v125,
      7: v126,
    },
    "harry-potter": {
      0: v127,
      1: v128,
      2: v129,
      3: v130,
      4: v131,
      5: v132,
      6: v133,
      7: v134,
    },
    "lotr": {
      0: v135,
      1: v136,
      2: v137,
      3: v138,
      4: v139,
      5: v140,
      6: v141,
      7: v142,
    },
    "norse": {
      0: v143,
      1: v144,
      2: v145,
      3: v146,
      4: v147,
      5: v148,
      6: v149,
      7: v150,
    },
    "olympians": {
      0: v151,
      1: v152,
      2: v153,
      3: v154,
      4: v155,
      5: v156,
      6: v157,
      7: v158,
    },
    "rebels": {
      0: v159,
      1: v160,
      2: v161,
      3: v162,
      4: v163,
      5: v164,
      6: v165,
      7: v166,
    },
    "starfleet": {
      0: v167,
      1: v168,
      2: v169,
      3: v170,
      4: v171,
      5: v172,
      6: v173,
      7: v174,
    },
    "xmen": {
      0: v175,
      1: v176,
      2: v177,
      3: v178,
      4: v179,
      5: v180,
      6: v181,
      7: v182,
    },
    "iakaframe": {
      0: v183,
      1: v184,
      2: v185,
      3: v186,
      4: v187,
      5: v188,
      6: v189,
    },
  },
  "grimoire-dark-fantasy": {
    "autobots": {
      0: v190,
      1: v191,
      2: v192,
      3: v193,
      4: v194,
      5: v195,
      6: v196,
      7: v197,
    },
    "avengers": {
      0: v198,
      1: v199,
      2: v200,
      3: v201,
      4: v202,
      5: v203,
      6: v204,
      7: v205,
    },
    "dc-justice": {
      0: v206,
      1: v207,
      2: v208,
      3: v209,
      4: v210,
      5: v211,
      6: v212,
      7: v213,
    },
    "defenders": {
      0: v214,
      1: v215,
      2: v216,
      3: v217,
      4: v218,
      5: v219,
      6: v220,
      7: v221,
    },
    "harry-potter": {
      0: v222,
      1: v223,
      2: v224,
      3: v225,
      4: v226,
      5: v227,
      6: v228,
      7: v229,
    },
    "lotr": {
      0: v230,
      1: v231,
      2: v232,
      3: v233,
      4: v234,
      5: v235,
      6: v236,
      7: v237,
    },
    "norse": {
      0: v238,
      1: v239,
      2: v240,
      3: v241,
      4: v242,
      5: v243,
      6: v244,
      7: v245,
    },
    "olympians": {
      0: v246,
      1: v247,
      2: v248,
      3: v249,
      4: v250,
      5: v251,
      6: v252,
      7: v253,
    },
    "rebels": {
      0: v254,
      1: v255,
      2: v256,
      3: v257,
      4: v258,
      5: v259,
      6: v260,
      7: v261,
    },
    "starfleet": {
      0: v262,
      1: v263,
      2: v264,
      3: v265,
      4: v266,
      5: v267,
      6: v268,
      7: v269,
    },
    "xmen": {
      0: v270,
      1: v271,
      2: v272,
      3: v273,
      4: v274,
      5: v275,
      6: v276,
      7: v277,
    },
    "iakaframe": {
      0: v278,
      1: v279,
      2: v280,
      3: v281,
      4: v282,
      5: v283,
      6: v284,
    },
  },
  "os-windows": {
    "autobots": {
      0: v285,
      1: v286,
      2: v287,
      3: v288,
      4: v289,
      5: v290,
      6: v291,
      7: v292,
    },
    "avengers": {
      0: v293,
      1: v294,
      2: v295,
      3: v296,
      4: v297,
      5: v298,
      6: v299,
      7: v300,
    },
    "dc-justice": {
      0: v301,
      1: v302,
      2: v303,
      3: v304,
      4: v305,
      5: v306,
      6: v307,
      7: v308,
    },
    "defenders": {
      0: v309,
      1: v310,
      2: v311,
      3: v312,
      4: v313,
      5: v314,
      6: v315,
      7: v316,
    },
    "harry-potter": {
      0: v317,
      1: v318,
      2: v319,
      3: v320,
      4: v321,
      5: v322,
      6: v323,
      7: v324,
    },
    "lotr": {
      0: v325,
      1: v326,
      2: v327,
      3: v328,
      4: v329,
      5: v330,
      6: v331,
      7: v332,
    },
    "norse": {
      0: v333,
      1: v334,
      2: v335,
      3: v336,
      4: v337,
      5: v338,
      6: v339,
      7: v340,
    },
    "olympians": {
      0: v341,
      1: v342,
      2: v343,
      3: v344,
      4: v345,
      5: v346,
      6: v347,
      7: v348,
    },
    "rebels": {
      0: v349,
      1: v350,
      2: v351,
      3: v352,
      4: v353,
      5: v354,
      6: v355,
      7: v356,
    },
    "starfleet": {
      0: v357,
      1: v358,
      2: v359,
      3: v360,
      4: v361,
      5: v362,
      6: v363,
      7: v364,
    },
    "xmen": {
      0: v365,
      1: v366,
      2: v367,
      3: v368,
      4: v369,
      5: v370,
      6: v371,
      7: v372,
    },
    "iakaframe": {
      0: v373,
      1: v374,
      2: v375,
      3: v376,
      4: v377,
      5: v378,
      6: v379,
    },
  },
  "os-ubuntu": {
    "autobots": {
      0: v380,
      1: v381,
      2: v382,
      3: v383,
      4: v384,
      5: v385,
      6: v386,
      7: v387,
    },
    "avengers": {
      0: v388,
      1: v389,
      2: v390,
      3: v391,
      4: v392,
      5: v393,
      6: v394,
      7: v395,
    },
    "dc-justice": {
      0: v396,
      1: v397,
      2: v398,
      3: v399,
      4: v400,
      5: v401,
      6: v402,
      7: v403,
    },
    "defenders": {
      0: v404,
      1: v405,
      2: v406,
      3: v407,
      4: v408,
      5: v409,
      6: v410,
      7: v411,
    },
    "harry-potter": {
      0: v412,
      1: v413,
      2: v414,
      3: v415,
      4: v416,
      5: v417,
      6: v418,
      7: v419,
    },
    "lotr": {
      0: v420,
      1: v421,
      2: v422,
      3: v423,
      4: v424,
      5: v425,
      6: v426,
      7: v427,
    },
    "norse": {
      0: v428,
      1: v429,
      2: v430,
      3: v431,
      4: v432,
      5: v433,
      6: v434,
      7: v435,
    },
    "olympians": {
      0: v436,
      1: v437,
      2: v438,
      3: v439,
      4: v440,
      5: v441,
      6: v442,
      7: v443,
    },
    "rebels": {
      0: v444,
      1: v445,
      2: v446,
      3: v447,
      4: v448,
      5: v449,
      6: v450,
      7: v451,
    },
    "starfleet": {
      0: v452,
      1: v453,
      2: v454,
      3: v455,
      4: v456,
      5: v457,
      6: v458,
      7: v459,
    },
    "xmen": {
      0: v460,
      1: v461,
      2: v462,
      3: v463,
      4: v464,
      5: v465,
      6: v466,
      7: v467,
    },
    "iakaframe": {
      0: v468,
      1: v469,
      2: v470,
      3: v471,
      4: v472,
      5: v473,
      6: v474,
    },
  },
  "os-android": {
    "autobots": {
      0: v475,
      1: v476,
      2: v477,
      3: v478,
      4: v479,
      5: v480,
      6: v481,
      7: v482,
    },
    "avengers": {
      0: v483,
      1: v484,
      2: v485,
      3: v486,
      4: v487,
      5: v488,
      6: v489,
      7: v490,
    },
    "dc-justice": {
      0: v491,
      1: v492,
      2: v493,
      3: v494,
      4: v495,
      5: v496,
      6: v497,
      7: v498,
    },
    "defenders": {
      0: v499,
      1: v500,
      2: v501,
      3: v502,
      4: v503,
      5: v504,
      6: v505,
      7: v506,
    },
    "harry-potter": {
      0: v507,
      1: v508,
      2: v509,
      3: v510,
      4: v511,
      5: v512,
      6: v513,
      7: v514,
    },
    "lotr": {
      0: v515,
      1: v516,
      2: v517,
      3: v518,
      4: v519,
      5: v520,
      6: v521,
      7: v522,
    },
    "norse": {
      0: v523,
      1: v524,
      2: v525,
      3: v526,
      4: v527,
      5: v528,
      6: v529,
      7: v530,
    },
    "olympians": {
      0: v531,
      1: v532,
      2: v533,
      3: v534,
      4: v535,
      5: v536,
      6: v537,
      7: v538,
    },
    "rebels": {
      0: v539,
      1: v540,
      2: v541,
      3: v542,
      4: v543,
      5: v544,
      6: v545,
      7: v546,
    },
    "starfleet": {
      0: v547,
      1: v548,
      2: v549,
      3: v550,
      4: v551,
      5: v552,
      6: v553,
      7: v554,
    },
    "xmen": {
      0: v555,
      1: v556,
      2: v557,
      3: v558,
      4: v559,
      5: v560,
      6: v561,
      7: v562,
    },
    "iakaframe": {
      0: v563,
      1: v564,
      2: v565,
      3: v566,
      4: v567,
      5: v568,
      6: v569,
    },
  },
  "os-macos": {
    "autobots": {
      0: v570,
      1: v571,
      2: v572,
      3: v573,
      4: v574,
      5: v575,
      6: v576,
      7: v577,
    },
    "avengers": {
      0: v578,
      1: v579,
      2: v580,
      3: v581,
      4: v582,
      5: v583,
      6: v584,
      7: v585,
    },
    "dc-justice": {
      0: v586,
      1: v587,
      2: v588,
      3: v589,
      4: v590,
      5: v591,
      6: v592,
      7: v593,
    },
    "defenders": {
      0: v594,
      1: v595,
      2: v596,
      3: v597,
      4: v598,
      5: v599,
      6: v600,
      7: v601,
    },
    "harry-potter": {
      0: v602,
      1: v603,
      2: v604,
      3: v605,
      4: v606,
      5: v607,
      6: v608,
      7: v609,
    },
    "lotr": {
      0: v610,
      1: v611,
      2: v612,
      3: v613,
      4: v614,
      5: v615,
      6: v616,
      7: v617,
    },
    "norse": {
      0: v618,
      1: v619,
      2: v620,
      3: v621,
      4: v622,
      5: v623,
      6: v624,
      7: v625,
    },
    "olympians": {
      0: v626,
      1: v627,
      2: v628,
      3: v629,
      4: v630,
      5: v631,
      6: v632,
      7: v633,
    },
    "rebels": {
      0: v634,
      1: v635,
      2: v636,
      3: v637,
      4: v638,
      5: v639,
      6: v640,
      7: v641,
    },
    "starfleet": {
      0: v642,
      1: v643,
      2: v644,
      3: v645,
      4: v646,
      5: v647,
      6: v648,
      7: v649,
    },
    "xmen": {
      0: v650,
      1: v651,
      2: v652,
      3: v653,
      4: v654,
      5: v655,
      6: v656,
      7: v657,
    },
    "iakaframe": {
      0: v658,
      1: v659,
      2: v660,
      3: v661,
      4: v662,
      5: v663,
      6: v664,
    },
  },
  "cartoon-std": {
    "autobots": {
      0: v665,
      1: v666,
      2: v667,
      3: v668,
      4: v669,
      5: v670,
      6: v671,
      7: v672,
    },
    "avengers": {
      0: v673,
      1: v674,
      2: v675,
      3: v676,
      4: v677,
      5: v678,
      6: v679,
      7: v680,
    },
    "dc-justice": {
      0: v681,
      1: v682,
      2: v683,
      3: v684,
      4: v685,
      5: v686,
      6: v687,
      7: v688,
    },
    "defenders": {
      0: v689,
      1: v690,
      2: v691,
      3: v692,
      4: v693,
      5: v694,
      6: v695,
      7: v696,
    },
    "harry-potter": {
      0: v697,
      1: v698,
      2: v699,
      3: v700,
      4: v701,
      5: v702,
      6: v703,
      7: v704,
    },
    "lotr": {
      0: v705,
      1: v706,
      2: v707,
      3: v708,
      4: v709,
      5: v710,
      6: v711,
      7: v712,
    },
    "norse": {
      0: v713,
      1: v714,
      2: v715,
      3: v716,
      4: v717,
      5: v718,
      6: v719,
      7: v720,
    },
    "olympians": {
      0: v721,
      1: v722,
      2: v723,
      3: v724,
      4: v725,
      5: v726,
      6: v727,
      7: v728,
    },
    "rebels": {
      0: v729,
      1: v730,
      2: v731,
      3: v732,
      4: v733,
      5: v734,
      6: v735,
      7: v736,
    },
    "starfleet": {
      0: v737,
      1: v738,
      2: v739,
      3: v740,
      4: v741,
      5: v742,
      6: v743,
      7: v744,
    },
    "xmen": {
      0: v745,
      1: v746,
      2: v747,
      3: v748,
      4: v749,
      5: v750,
      6: v751,
      7: v752,
    },
    "iakaframe": {
      0: v753,
      1: v754,
      2: v755,
      3: v756,
      4: v757,
      5: v758,
      6: v759,
    },
  },
  "photoreal-modern": {
    "autobots": {
      0: v760,
      1: v761,
      2: v762,
      3: v763,
      4: v764,
      5: v765,
      6: v766,
      7: v767,
    },
    "avengers": {
      0: v768,
      1: v769,
      2: v770,
      3: v771,
      4: v772,
      5: v773,
      6: v774,
      7: v775,
    },
    "dc-justice": {
      0: v776,
      1: v777,
      2: v778,
      3: v779,
      4: v780,
      5: v781,
      6: v782,
      7: v783,
    },
    "defenders": {
      0: v784,
      1: v785,
      2: v786,
      3: v787,
      4: v788,
      5: v789,
      6: v790,
      7: v791,
    },
    "harry-potter": {
      0: v792,
      1: v793,
      2: v794,
      3: v795,
      4: v796,
      5: v797,
      6: v798,
      7: v799,
    },
    "lotr": {
      0: v800,
      1: v801,
      2: v802,
      3: v803,
      4: v804,
      5: v805,
      6: v806,
      7: v807,
    },
    "norse": {
      0: v808,
      1: v809,
      2: v810,
      3: v811,
      4: v812,
      5: v813,
      6: v814,
      7: v815,
    },
    "olympians": {
      0: v816,
      1: v817,
      2: v818,
      3: v819,
      4: v820,
      5: v821,
      6: v822,
      7: v823,
    },
    "rebels": {
      0: v824,
      1: v825,
      2: v826,
      3: v827,
      4: v828,
      5: v829,
      6: v830,
      7: v831,
    },
    "starfleet": {
      0: v832,
      1: v833,
      2: v834,
      3: v835,
      4: v836,
      5: v837,
      6: v838,
      7: v839,
    },
    "xmen": {
      0: v840,
      1: v841,
      2: v842,
      3: v843,
      4: v844,
      5: v845,
      6: v846,
      7: v847,
    },
    "iakaframe": {
      0: v848,
      1: v849,
      2: v850,
      3: v851,
      4: v852,
      5: v853,
      6: v854,
    },
  },
  "studio-clair": {
    "autobots": {
      0: v855,
      1: v856,
      2: v857,
      3: v858,
      4: v859,
      5: v860,
      6: v861,
      7: v862,
    },
    "avengers": {
      0: v863,
      1: v864,
      2: v865,
      3: v866,
      4: v867,
      5: v868,
      6: v869,
      7: v870,
    },
    "dc-justice": {
      0: v871,
      1: v872,
      2: v873,
      3: v874,
      4: v875,
      5: v876,
      6: v877,
      7: v878,
    },
    "defenders": {
      0: v879,
      1: v880,
      2: v881,
      3: v882,
      4: v883,
      5: v884,
      6: v885,
      7: v886,
    },
    "harry-potter": {
      0: v887,
      1: v888,
      2: v889,
      3: v890,
      4: v891,
      5: v892,
      6: v893,
      7: v894,
    },
    "lotr": {
      0: v895,
      1: v896,
      2: v897,
      3: v898,
      4: v899,
      5: v900,
      6: v901,
      7: v902,
    },
    "norse": {
      0: v903,
      1: v904,
      2: v905,
      3: v906,
      4: v907,
      5: v908,
      6: v909,
      7: v910,
    },
    "olympians": {
      0: v911,
      1: v912,
      2: v913,
      3: v914,
      4: v915,
      5: v916,
      6: v917,
      7: v918,
    },
    "rebels": {
      0: v919,
      1: v920,
      2: v921,
      3: v922,
      4: v923,
      5: v924,
      6: v925,
      7: v926,
    },
    "starfleet": {
      0: v927,
      1: v928,
      2: v929,
      3: v930,
      4: v931,
      5: v932,
      6: v933,
      7: v934,
    },
    "xmen": {
      0: v935,
      1: v936,
      2: v937,
      3: v938,
      4: v939,
      5: v940,
      6: v941,
      7: v942,
    },
    "iakaframe": {
    },
  },
};
