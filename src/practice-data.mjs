export const ROOT_FAMILIES = [
  { id:'kommen', label:'kommen 계열', root:'kommen', words:['kommen','ankommen','bekommen','mitkommen'] },
  { id:'machen', label:'machen 계열', root:'machen', words:['machen','anmachen','ausmachen','mitmachen'] },
  { id:'fahren', label:'fahren 계열', root:'fahren', words:['fahren','abfahren','Rad fahren'] },
  { id:'kaufen', label:'kaufen 계열', root:'kaufen', words:['kaufen','einkaufen','verkaufen'] },
  { id:'sehen', label:'sehen 계열', root:'sehen', words:['sehen','aussehen','fernsehen'] },
  { id:'stehen', label:'stehen 계열', root:'stehen', words:['stehen','aufstehen','verstehen'] },
  { id:'holen', label:'holen 계열', root:'holen', words:['holen','abholen','wiederholen'] },
  { id:'bringen', label:'bringen 계열', root:'bringen', words:['bringen','mitbringen'] },
  { id:'nehmen', label:'nehmen 계열', root:'nehmen', words:['nehmen','mitnehmen'] },
  { id:'geben', label:'geben 계열', root:'geben', words:['geben','abgeben'] },
];

export const TOPIC_GROUPS = [
  { id:'transport', label:'교통·이동', icon:'🚆', words:['die Bahn','der Bahnhof','der Bus, -se','das Auto, -s','das Fahrrad, -ä, er','das Taxi, -s','der Flughafen','das Flugzeug','die Haltestelle','die Straßenbahn','der Zug, -ü, e','das Ticket, -s','fahren','fliegen'] },
  { id:'body-health', label:'신체·건강', icon:'🩺', words:['das Auge, -n','der Bauch','der Fuß, -ü, e','die Hand, -ä, e','das Haar, -e','der Kopf','der Mund','der Arzt, -Ä, e','der Doktor','die Praxis','das Fieber','weh tun','krank'] },
  { id:'food', label:'음식·음료', icon:'🍎', words:['das Essen','essen','trinken','das Brot, -e','das Brötchen, –','die Milch','der Kaffee','das Wasser','die Kartoffel, -n','die Bäckerei','der Hunger','das Lokal'] },
  { id:'family', label:'가족·사람', icon:'👨‍👩‍👧', words:['die Familie, -n','die Eltern (pl.)','die Mutter, -ü','der Vater, -ä','der Bruder, -ü','die Schwester, -n','die Geschwister (pl.)','das Kind, -er','der Sohn, -ö, e','die Tochter, -ö','die Großeltern (pl.)','der Partner, -/ die Partnerin, -nen'] },
  { id:'home', label:'집·생활', icon:'🏠', words:['das Haus, -ä, er','die Wohnung, -en','das Zimmer, –','die Küche','das Bett, -en','der Raum, -ä, e','der Tisch, -e','der Herd','der Balkon','das Bad','die Dusche','die Toilette, -en','der Schrank, -ä, e','das Sofa'] },
  { id:'school-work', label:'학교·직업', icon:'📚', words:['die Schule','der Unterricht','die Stunde, -n','der Lehrer, –','der Schüler, –','der Student, -en','der Beruf, -e','der Job, -s','der Arbeitsplatz, -ä, e','die Firma','arbeiten','lernen'] },
  { id:'travel', label:'여행·숙박', icon:'🧳', words:['reisen','die Reise','das Reisebüro, -s','der Reiseführer','der Urlaub','der Pass, -ä, e','das Gepäck','der Koffer, –','das Hotel, -s','der Gast, -ä, e','das Doppelzimmer','das Einzelzimmer'] },
  { id:'communication', label:'통신·우편·미디어', icon:'📱', words:['anrufen','der Anruf, -e','telefonieren','das Telefon','das Handy, -s','die Post','der Brief, -e','die E-Mail, -s','das Internet','die Zeitung, -en','fernsehen'] },
  { id:'shopping', label:'쇼핑·돈', icon:'🛍️', words:['einkaufen','kaufen','verkaufen','der Preis, -e','das Geld','bar','die Bank','die Kasse','(Kredit)-Karte, -n','kosten','bezahlen','zahlen'] },
];

export const ANTONYM_PAIRS = [
  { id:'big-small', prompts:['크다','작다'], words:['groß','klein'] },
  { id:'old-young', prompts:['나이 들다','젊다'], words:['alt','jung'] },
  { id:'good-bad', prompts:['좋다','나쁘다'], words:['gut','schlecht'] },
  { id:'right-wrong', prompts:['맞다','틀리다'], words:['richtig','falsch'] },
  { id:'many-few', prompts:['많다','적다'], words:['viel','wenig'] },
  { id:'fast-slow', prompts:['빠르다','느리다'], words:['schnell','langsam'] },
  { id:'left-right', prompts:['왼쪽','오른쪽'], words:['links','rechts'] },
  { id:'up-down', prompts:['위','아래'], words:['oben','unten'] },
  { id:'expensive-cheap', prompts:['비싸다','저렴하다'], words:['teuer','günstig'] },
  { id:'loud-quiet', prompts:['시끄럽다','조용하다'], words:['laut','leise'] },
  { id:'long-short', prompts:['길다','짧다'], words:['lang','kurz'] },
  { id:'easy-hard', prompts:['쉽다·가볍다','어렵다·무겁다'], words:['leicht','schwer'] },
  { id:'male-female', prompts:['남성','여성'], words:['männlich','weiblich'] },
  { id:'alone-together', prompts:['혼자','함께'], words:['allein','zusammen'] },
  { id:'yes-no', prompts:['네','아니요'], words:['ja','nein'] },
];

export const PREFIX_CARDS = [
  { prefix:'ab-', meaning:'떨어져 나감·출발', note:'어떤 지점에서 멀어지거나 떼어 내는 느낌을 더해요.', examples:['abfahren','abholen','abgeben'] },
  { prefix:'an-', meaning:'접근·시작·접촉', note:'무언가에 가까이 가거나 동작을 시작하는 느낌을 더해요.', examples:['ankommen','anmachen','anrufen'] },
  { prefix:'auf-', meaning:'위로·열림 (단어별 의미 변화)', note:'aufstehen은 위로 일어나는 느낌이지만, aufhören처럼 완성된 뜻을 따로 외워야 하는 단어도 있어요.', examples:['aufstehen','aufhören'], extraExamples:[{german:'aufmachen',korean:'열다',english:'open'}] },
  { prefix:'aus-', meaning:'밖으로·완료·꺼짐', note:'안에서 밖으로 나가거나 동작이 끝나는 느낌을 더할 수 있지만, 완성된 뜻은 단어별로 확인해요.', examples:['aussehen','ausmachen','ausfüllen'], extraExamples:[{german:'auskommen',korean:'잘 지내다/충분하다',english:'get along/manage/be sufficient'}] },
  { prefix:'ein-', meaning:'안으로·진입', note:'밖에서 안으로 들어가거나 어떤 활동에 진입하는 느낌이 자주 나타나요.', examples:['einkaufen','einsteigen'] },
  { prefix:'mit-', meaning:'함께·동반', note:'다른 사람이나 물건과 함께 움직이는 뜻을 더해요.', examples:['mitkommen','mitmachen','mitbringen','mitnehmen'] },
  { prefix:'vor-', meaning:'앞·이전·미리', note:'공간적으로 앞이거나 시간적으로 먼저라는 느낌을 더해요.', examples:['(sich) vorstellen','der Vorname, -n','die Vorwahl'], extraExamples:[{german:'vorbereiten',korean:'준비하다',english:'prepare'}] },
  { prefix:'zurück-', meaning:'뒤로·되돌아감', note:'원래 위치나 이전 상태로 돌아가는 뜻을 더해요.', examples:[], extraExamples:[{german:'zurückkommen',korean:'돌아오다',english:'come back'},{german:'zurückfahren',korean:'돌아가다',english:'travel/drive back'}] },
  { prefix:'zu-', meaning:'닫힘·~쪽으로', note:'닫히는 움직임이나 어떤 대상을 향하는 느낌을 나타낼 수 있어요.', examples:[], extraExamples:[{german:'zumachen',korean:'닫다',english:'close'},{german:'zuhören',korean:'귀 기울여 듣다',english:'listen'}] },
  { prefix:'be-', meaning:'대상에 작용·타동화', note:'분리되지 않는 접두사예요. 뜻을 단순 합산하기 어려운 단어도 많아요.', examples:['bekommen','bezahlen','besuchen'] },
  { prefix:'ver-', meaning:'변화·결과·잘못', note:'분리되지 않으며 의미가 다양해요. 각 단어의 완성된 뜻으로 익혀요.', examples:['verkaufen','verstehen','verdienen'] },
  { prefix:'wieder-', meaning:'다시·반복', note:'이미 한 동작을 다시 한다는 뜻을 더해요.', examples:['wiederholen','das Wiedersehen','das Wiederhören'], extraExamples:[{german:'wiederkommen',korean:'다시 오다',english:'come again'}] },
];
