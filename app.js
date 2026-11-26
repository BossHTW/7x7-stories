'use strict';
const TEAM_EMAIL = '7x7storiessf@gmail.com';
const CATEGORY_NAMES = ['All support', 'Basics', 'Housing', 'LGBTQ+', 'Health', 'Pets', 'Work & learning', 'Community'];
let resources = [];
let selectedCategory = 'All support';
let visibleResources = [];
let map = null;
let markers = null;
let activeView = 'map';
let selectedResourceId = null;
const markerById = new Map();
let mapFailureTimer = null;
let contactMode = null;
let contactResource = null;
let returnFocus = null;
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const checkedDate = value => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z'));
const tel = number => `tel:+1${number.replace(/\D/g, '')}`;
function directionsLink(resource) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`;
}
function matchesAge(resource, age) {
  if (age === 'all' || (resource.minAge == null && resource.maxAge == null)) return true;
  const lower = resource.minAge ?? 0;
  const upper = resource.maxAge ?? Infinity;
  if (age === 'under18') return lower <= 17 && upper >= 0;
  if (age === '18to24') return lower <= 24 && upper >= 18;
  return upper >= 25;
}
function filterResources() {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  const age = $('#age').value;
  const area = $('#area').value;
  visibleResources = resources.filter(resource => {
    const searchable = [resource.name, resource.area, resource.summary, resource.services, resource.eligibility, resource.address, ...resource.categories].join(' ').toLocaleLowerCase();
    return (selectedCategory === 'All support' || resource.categories.includes(selectedCategory)) &&
      (area === 'all' || resource.area === area) && matchesAge(resource, age) && words.every(word => searchable.includes(word));
  });
  const count = visibleResources.length;
  $('#result-count').textContent = `${count} ${count === 1 ? 'resource' : 'resources'}${count !== resources.length ? ` of ${resources.length}` : ' to explore'}`;
  $('#age-note').hidden = age === 'all';
  $('#clear-filters').hidden = !query && age === 'all' && area === 'all' && selectedCategory === 'All support';
  if (!visibleResources.some(r => r.id === selectedResourceId)) selectedResourceId = null;
  renderResources();
  renderSelection();
  if (map) updateMap();
}
function providerBadge(resource) {
  const fallback = `<span class="provider-initials">${escapeHTML(resource.shortName)}</span>`;
  return `<span class="provider-badge" aria-hidden="true">${resource.logo ? `<img src="${escapeHTML(resource.logo)}" alt="" width="40" height="40">` : fallback}</span>`;
}
function resourceCard(resource, context = 'resource') {
  const e = escapeHTML;
  let quickContact = resource.phone ? `<a class="phone" href="${tel(resource.phone)}">Call ${e(resource.phone)}</a>` :
    resource.text ? `<a class="phone" href="sms:+1${resource.text.replace(/\D/g, '')}">Text ${e(resource.text)}</a>` : `<a class="phone" href="${e(resource.sources[0][1])}">Provider website</a>`;
  const visit = resource.map && resource.coordinates ? `<a href="${directionsLink(resource)}" aria-label="Directions to ${e(resource.name)}">Directions</a>` : '';
  return `<article class="resource-card" id="${context}-${e(resource.id)}" aria-labelledby="${context}-title-${e(resource.id)}">
    <div class="card-main"><div class="resource-meta"><span>${e(resource.area)}</span><span class="age-badge">${e(resource.ageLabel)}</span></div>
    <div class="resource-identity">${providerBadge(resource)}<h3 id="${context}-title-${e(resource.id)}">${e(resource.name)}</h3></div><p class="summary">${e(resource.summary)}</p>
    <div class="quick-facts"><p><strong>Where:</strong> ${e(resource.address)}</p><p><strong>When:</strong> ${e(resource.hours)}</p></div>
    <div class="tags">${resource.categories.map(tag => `<span class="tag">${e(tag)}</span>`).join('')}</div></div>
    <details><summary>Eligibility, access & sources<span class="visually-hidden"> for ${e(resource.name)}</span></summary>
      <div class="detail-body"><dl><dt>What’s available</dt><dd>${e(resource.services)}</dd><dt>Who it’s for</dt><dd>${e(resource.eligibility)}</dd><dt>How to get connected</dt><dd>${e(resource.steps)}</dd><dt>Cost</dt><dd>${e(resource.cost)}</dd><dt>Accessibility & languages</dt><dd>${e(resource.access)}</dd>${resource.email ? `<dt>Email the provider</dt><dd><a href="mailto:${e(resource.email)}">${e(resource.email)}</a></dd>`:''}</dl>
      <p class="detail-note">${e(resource.note)}</p><ul class="sources">${resource.sources.map(([label,url]) => `<li><a href="${e(url)}">${e(label)}</a></li>`).join('')}</ul><p class="checked">Official website checked ${checkedDate(resource.checked)}. Not directly confirmed with provider.</p><button type="button" class="text-button provider-verify" data-verify="${e(resource.id)}">Represent this organization? Verify this listing</button></div>
    </details><div class="card-actions">${quickContact}${visit}${context === 'resource' && resource.map ? `<button type="button" data-show-resource="${e(resource.id)}">Show on map</button>` : ''}<button type="button" data-feedback="${e(resource.id)}" aria-label="Suggest a correction for ${e(resource.name)}">Suggest a correction</button></div></article>`;
}
function renderResources() {
  $('#resource-list').innerHTML = visibleResources.length ? visibleResources.map(resource => resourceCard(resource)).join('') :
    '<div class="empty-results"><h3>No matches yet</h3><p>Try another word, a different age range, or clear the filters. You can also suggest a resource we should add.</p><button class="text-button" data-contact="addition">Recommend a resource</button></div>';
}
function renderSelection() {
  const resource = visibleResources.find(r => r.id === selectedResourceId);
  $('#map-selection').innerHTML = resource ? `<div class="selection-label"><span>SELECTED PLACE</span><button type="button" class="text-button" id="clear-selection">Clear</button></div>${resourceCard(resource,'selected')}` :
    `<div class="map-welcome"><p class="eyebrow">YOUR CITY, YOUR SUPPORT</p><h3>${visibleResources.length ? 'Choose a place on the map.' : 'No matches yet.'}</h3><p>${visibleResources.length ? 'Tap a logo to see services, eligibility, and how to connect. The same logo appears on its resource card.' : 'Try a different search or clear the filters.'}</p><button type="button" class="button secondary" data-use-list>Browse all matching resources</button></div>`;
}
function selectResource(id, focus = false) {
  const resource = visibleResources.find(r => r.id === id);
  if (!resource) return;
  selectedResourceId = id;
  renderSelection();
  markerById.forEach((marker,key) => {
    marker.getElement()?.classList.toggle('is-selected',key === id);
    marker.setZIndexOffset(key === id ? 1000 : 0);
  });
  if (focus) {
    const card = document.getElementById(`selected-${id}`);
    card.querySelector('details').open = true;
    const heading = card.querySelector('h3'); heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    card.scrollIntoView({block:'nearest',behavior:'auto'});
  }
}
function updateMap() {
  markers.clearLayers(); markerById.clear();
  const located = visibleResources.filter(resource => resource.map && resource.coordinates);
  const unmapped = visibleResources.length - located.length;
  $('#map-summary').textContent = `${located.length} ${located.length === 1 ? 'place' : 'places'} on the map`;
  $('#unmapped-resources').hidden = !unmapped;
  $('#unmapped-resources').textContent = `Also explore ${unmapped} outreach, referral, or rotating ${unmapped === 1 ? 'resource' : 'resources'} in List view`;
  located.forEach(resource => {
    const marker = L.marker(resource.coordinates, {
      icon:L.divIcon({className:'provider-pin', html:providerBadge(resource), iconSize:[44,44], iconAnchor:[22,22]}),
      title:resource.name, alt:resource.name, keyboard:true, riseOnHover:true
    });
    marker.bindTooltip(resource.name,{direction:'top',offset:[0,-22]});
    marker.on('click',() => selectResource(resource.id));
    markers.addLayer(marker); markerById.set(resource.id,marker);
    marker.getElement()?.classList.toggle('is-selected',resource.id === selectedResourceId);
  });
  if (located.length) map.fitBounds(L.latLngBounds(located.map(resource => resource.coordinates)), {padding:[35,35], maxZoom:15, animate:false});
  else map.setView([37.766,-122.433],12,{animate:false});
}
function setView(view) {
  activeView = view;
  $('#map-panel').hidden = view !== 'map';
  $('#resource-list').hidden = view !== 'list';
  $('#map-view').setAttribute('aria-pressed',String(view === 'map'));
  $('#list-view').setAttribute('aria-pressed',String(view === 'list'));
  $('#directory-layout').classList.toggle('map-view',view === 'map');
  if (view !== 'map') return;
  if (!window.L) {
    $('#map-status').textContent = 'The map could not load. Choose List view for all resource information.';
    return;
  }
  if (!map) {
    map = L.map('map', {scrollWheelZoom:false}).setView([37.766,-122.433],12);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    tiles.on('tileerror', () => { $('#map-status').textContent = 'Some map tiles could not load. List view has all resource information.'; });
    tiles.on('load', () => { if ($('#map-status').textContent.startsWith('Loading')) $('#map-status').textContent = ''; clearTimeout(mapFailureTimer); });
    $('#map-status').textContent = 'Loading the map…';
    mapFailureTimer = setTimeout(() => {
      if ($('#map-status').textContent.startsWith('Loading')) $('#map-status').textContent = 'The map is taking a while to load. You can use List view.';
    },12000);
    tiles.addTo(map); markers = L.layerGroup().addTo(map);
  }
  map.invalidateSize(); updateMap();
}
function formField(id,label,type='text',extra='') {
  return `<div><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" ${extra}></div>`;
}
function storyQuestion(id, label, placeholder, required = false, max = 700) {
  return `<div><label for="${id}">${label} ${required ? '<span>(required)</span>' : '<span>(optional)</span>'}</label><textarea id="${id}" name="${id}" ${required ? 'required' : ''} maxlength="${max}" placeholder="${placeholder}"></textarea></div>`;
}
function syncStoryApproach() {
  if (!$('#story-approach')) return;
  const proposal = $('#story-approach').value === 'proposal';
  $('#story-outline').hidden = proposal; $('#story-outline').disabled = proposal;
  $('#story-proposal').hidden = !proposal; $('#story-proposal').disabled = !proposal;
}
function openContact(mode, resource, origin) {
  contactMode = mode; contactResource = resource; returnFocus = origin;
  const correction = mode === 'correction';
  $('#dialog-eyebrow').textContent = correction ? 'HELP KEEP THE GUIDE CURRENT' : '7x7 STORIES · FIRST ISSUE';
  $('#dialog-title').textContent = correction ? (resource ? 'Suggest a correction' : 'Share an update or resource') : (mode === 'self' ? 'Tell us a little about your story' : 'Nominate someone you know');
  $('#dialog-intro').textContent = correction ? 'Tell us what changed. A date or a public source helps us check it. Please leave out private records and other people’s identifying details.' :
    mode === 'self' ? 'A few sentences are enough. Use our prompts or propose another idea—writing, art, photos, audio, or something else. Share only what you’re comfortable emailing. We’ll shape the story with you before publication.' :
    'Ask their permission first, or invite them to email us themselves. Please don’t share their contact details or personal experiences without permission.';
  if (mode === 'addition') {
    $('#dialog-eyebrow').textContent = 'HELP THE MAP GROW';
    $('#dialog-title').textContent = 'Recommend a resource';
    $('#dialog-intro').textContent = 'Tell us about a place, program, or service young people in SF should know about. We’ll check the details before adding it.';
    $('#dialog-fields').innerHTML = `${formField('resource-name','Resource or organization name (required)','text','required maxlength="150"')}${formField('source','Website or public information link (optional)','url','maxlength="500" placeholder="https://…"')}<div><label for="message">What does it offer, and who can use it? (required)</label><textarea id="message" name="message" required maxlength="2500" placeholder="Services, location, ages, cost, or anything that helps someone get connected. Share only public information."></textarea></div>`;
  } else if (mode === 'verify') {
    $('#dialog-eyebrow').textContent = 'FOR RESOURCE PROVIDERS';
    $('#dialog-title').textContent = 'Verify your organization’s information';
    $('#dialog-intro').textContent = 'Please use your organization’s email when sending. We’ll confirm your connection to the provider and review the details before updating the listing. This does not automatically mark a listing as verified.';
    $('#dialog-fields').innerHTML = `${resource ? `<p class="contact-resource">${escapeHTML(resource.name)}</p>` : `<div><label for="listing-id">Your listing</label><select id="listing-id" name="listing-id">${resources.map(r => `<option value="${escapeHTML(r.id)}">${escapeHTML(r.name)}</option>`).join('')}</select></div>`}${formField('representative','Your name and role (required)','text','required maxlength="150"')}${formField('source','Official service information link (optional)','url','maxlength="500" placeholder="https://…"')}<div><label for="message">Confirm or update the listing details (required)</label><textarea id="message" name="message" required maxlength="2500" placeholder="Please cover eligibility, hours, address, cost, referrals, and accessibility. Note any fields you cannot confirm."></textarea></div><div><label class="checkbox-label"><input type="checkbox" name="permission" required> I represent this organization and am authorized to confirm its service information.</label></div>`;
  } else if (correction) {
    $('#dialog-fields').innerHTML = `${resource ? `<p class="contact-resource">${escapeHTML(resource.name)}</p>` : formField('resource-name','Resource name','text','required maxlength="150"')}
      <div><label for="update-type">What needs updating?</label><select id="update-type" name="update-type"><option>Eligibility / age requirements</option><option>Hours / availability</option><option>Address / contact details</option><option>Cost / documents / referral</option><option>Accessibility / language access</option><option>Suggest a new resource</option><option>Something else</option></select></div>
      <div><label for="message">What did you find? <span>(required)</span></label><textarea id="message" name="message" required maxlength="2500" placeholder="For example: the age limit at this program was different from the listing."></textarea></div>
      ${formField('observed','When did you notice this? (optional)','date')}${formField('source','Public source link (optional)','url','placeholder="https://…" maxlength="500"')}`;
  } else if (mode === 'self') {
    $('#dialog-fields').innerHTML = `${formField('preferred-name','Name or nickname (required)','text','required maxlength="100" autocomplete="nickname"')}<p class="field-hint">Use a nickname or “Anonymous” if you prefer.</p>
      ${formField('pronouns','Pronouns (optional)','text','maxlength="60"')}
      <div><label for="story-approach">How would you like to start?</label><select id="story-approach" name="story-approach"><option value="outline">Use the story outline</option><option value="proposal">Propose something else</option></select></div>
      <fieldset id="story-outline" class="story-fieldset"><legend class="visually-hidden">Story outline</legend>
        ${storyQuestion('story-about','Tell us a little about yourself','Your interests, hobbies, communities, or what you enjoy doing.',true,500)}
        ${storyQuestion('story-thread','What would you like your story to explore?','Something you care about, an experience, something you’re making, or a contribution you’d like to share. No hardship story required.',true,900)}
        ${storyQuestion('story-places','Any people, places, or resources you’d like to include?','Name a public place or resource if you want. Don’t include home addresses or someone else’s private information.',false,500)}
        ${storyQuestion('story-next','What are you exploring or hoping for next?','An interest, project, question, or next step. It’s okay to still be figuring it out.',false,500)}
      </fieldset>
      <fieldset id="story-proposal" class="story-fieldset" hidden disabled><legend class="visually-hidden">Your own idea</legend>
        ${formField('story-format','Format you have in mind (optional)','text','maxlength="100" placeholder="A photo essay, poem, voice note, comic…"')}
        ${storyQuestion('story-pitch','What’s your idea?','What would you like to share, and how would you like us to help? An early idea is enough.',true,1800)}
      </fieldset>
      ${storyQuestion('story-preferences','Any sharing preferences?','For example: use a nickname, skip photos, don’t name a location, or talk through the format first. No need to explain why.',false,400)}
      <div><label class="checkbox-label"><input name="permission" type="checkbox" required> I understand the team will follow up before anything is published. This nomination is not permission to publish.</label></div>`;
    syncStoryApproach();
  } else {
    $('#dialog-fields').innerHTML = `${formField('preferred-name','Your name or nickname (optional)','text','maxlength="100"')}
      ${formField('nominee-name','Their name or nickname (required)','text','required maxlength="100"')}
      ${storyQuestion('nomination-reason','Why would you like to nominate them?','A few sentences about their interests, contribution, or a story they’d like to share. Please leave out private experiences and contact details.',true,1000)}
      <details class="nomination-extra"><summary>Have another idea or format in mind? (optional)</summary>${storyQuestion('nomination-idea','Your idea','For example: their artwork, a conversation together, or a photo story.',false,500)}</details>
      <div><label class="checkbox-label"><input name="permission" type="checkbox" required> I have their permission to make this nomination and share the information in this message. This is not permission to publish.</label></div>`;
  }
  $('#email-status').textContent = ''; $('#manual-message').hidden = true;
  $('#contact-dialog').showModal();
  $('#dialog-fields').querySelector('input,select,textarea')?.focus();
}
function buildEmail() {
  const form = $('#contact-form');
  if (!form.reportValidity()) return null;
  const data = new FormData(form);
  let subject, body;
  if (contactMode === 'addition') {
    subject = `[Resource recommendation] ${data.get('resource-name')}`;
    body = `Resource: ${data.get('resource-name')}\nPublic source: ${data.get('source') || 'Not supplied'}\n\n${data.get('message')}\n\nPlease review this recommendation before adding it to the guide.`;
  } else if (contactMode === 'verify') {
    const listing = contactResource || resources.find(r => r.id === data.get('listing-id'));
    subject = `[Provider verification] ${listing.name}`;
    body = `Resource: ${listing.name}\nListing ID: ${listing.id}\nRepresentative: ${data.get('representative')}\nOfficial source: ${data.get('source') || 'Not supplied'}\n\n${data.get('message')}\n\nI represent this organization and am authorized to confirm this information. Please confirm my connection and review the details before updating the listing or its verification status.`;
  } else if (contactMode === 'correction') {
    const name = contactResource ? contactResource.name : data.get('resource-name');
    subject = `[Resource update] ${name}`;
    body = `Resource: ${name}\nTopic: ${data.get('update-type')}\n\n${data.get('message')}\n\nNoticed on: ${data.get('observed') || 'Not specified'}\nPublic source: ${data.get('source') || 'Not supplied'}\n\nListing ID: ${contactResource?.id || 'New / general suggestion'}\nWebsite information checked: ${contactResource?.checked || 'See directory'}\n\nPlease review this suggestion before updating the public guide.`;
  } else if (contactMode === 'self') {
    const proposal = data.get('story-approach') === 'proposal';
    subject = proposal ? '[Story proposal] My idea for 7x7' : '[Story nomination] I’d like to share my story';
    const intro = `Nomination: Myself\nName / nickname: ${data.get('preferred-name')}\nPronouns: ${data.get('pronouns') || 'Not supplied'}\nApproach: ${proposal ? 'My own idea / format' : 'Guided profile outline'}`;
    const story = proposal ? `Format: ${data.get('story-format') || 'Let’s discuss'}\n\nMy idea:\n${data.get('story-pitch')}` :
      `About me:\n${data.get('story-about')}\n\nWhat I’d like my story to explore:\n${data.get('story-thread')}\n\nPeople, places, or resources I’d like to include:\n${data.get('story-places') || 'Not supplied'}\n\nWhat I’m exploring or hoping for next:\n${data.get('story-next') || 'Not supplied'}`;
    body = `${intro}\n\n${story}\n\nSharing preferences:\n${data.get('story-preferences') || 'Please ask me before deciding what to include.'}\n\nPlease reply to this email to follow up. I’d like to review the wording, quotes, photos, and any location references before publication. This nomination does not grant publication permission.`;
  } else {
    subject = '[Story nomination] Someone I know';
    body = `Nomination: Someone I know (with permission)\nMy name / nickname: ${data.get('preferred-name') || 'Not supplied'}\nTheir name / nickname: ${data.get('nominee-name')}\n\nWhy I’m nominating them:\n${data.get('nomination-reason')}${data.get('nomination-idea') ? `\n\nAnother idea / format:\n${data.get('nomination-idea')}` : ''}\n\nI have their permission to make this nomination and share this information. Please reply to me about next steps. This nomination does not grant publication permission; please work with the nominee on their own choices before publication.`;
  }
  $('#prepared-message').value = `To: ${TEAM_EMAIL}\nSubject: ${subject}\n\n${body}`;
  return {subject,body};
}
function setupContact() {
  $('#contact-form').addEventListener('change',event => { if (event.target.id === 'story-approach') syncStoryApproach(); });
  $('#contact-form').addEventListener('input',() => { $('#email-status').textContent = ''; $('#manual-message').hidden = true; });
  document.addEventListener('click', event => {
    const feedback = event.target.closest('[data-feedback]');
    const nominate = event.target.closest('[data-nominate]');
    const contact = event.target.closest('[data-contact]');
    const verify = event.target.closest('[data-verify]');
    const show = event.target.closest('[data-show-resource]');
    if (contact) openContact(contact.dataset.contact,null,contact);
    if (verify) openContact('verify',resources.find(r => r.id === verify.dataset.verify),verify);
    if (event.target.closest('[data-use-list]')) setView('list');
    if (event.target.closest('#clear-selection')) { selectedResourceId = null; renderSelection(); markerById.forEach(m => m.getElement()?.classList.remove('is-selected')); $('#map').focus(); }
    if (show) {
      setView('map'); selectResource(show.dataset.showResource);
      const marker = markerById.get(show.dataset.showResource);
      if (marker) map.setView(marker.getLatLng(),16,{animate:false});
      $('#map').scrollIntoView({block:'center',behavior:'auto'}); $('#map').focus({preventScroll:true});
    }
    if (feedback) { event.preventDefault(); openContact('correction',resources.find(r => r.id === feedback.dataset.feedback) || null,feedback); }
    if (nominate) {
      openContact(nominate.dataset.nominate,null,nominate);
      if (nominate.dataset.storyApproach === 'proposal') { $('#story-approach').value = 'proposal'; syncStoryApproach(); $('#story-pitch').focus(); }
    }
  });
  $('#close-dialog').addEventListener('click',() => $('#contact-dialog').close());
  $('#contact-dialog').addEventListener('close',() => returnFocus?.focus());
  $('#contact-form').addEventListener('submit',event => {
    event.preventDefault(); const message = buildEmail(); if (!message) return;
    const uri = `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
    $('#manual-message').hidden = false;
    if (uri.length > 6500) {
      $('#email-status').textContent = 'Your message is ready below. It’s long enough that an email link may cut it off. Use Copy email text and paste it into an email to 7x7storiessf@gmail.com.';
      return;
    }
    $('#email-status').textContent = 'Your email app should open. Review the draft and send it there. Nothing has been submitted by this website.';
    window.location.href = uri;
  });
  $('#copy-message').addEventListener('click',async () => {
    const message = buildEmail(); if (!message) return;
    $('#manual-message').hidden = false;
    try { await navigator.clipboard.writeText($('#prepared-message').value); $('#email-status').textContent = 'Copied. Paste into an email to 7x7storiessf@gmail.com and send when you’re ready.'; }
    catch { $('#prepared-message').focus(); $('#prepared-message').select(); $('#email-status').textContent = 'Select and copy the prepared message below, then send it from your email app.'; }
  });
}
async function init() {
  setupContact();
  $('#more-filters').open = matchMedia('(min-width: 801px)').matches;
  $('#map-view').addEventListener('click',() => setView('map'));
  $('#list-view').addEventListener('click',() => setView('list'));
  $('#unmapped-resources').addEventListener('click',() => setView('list'));
  $('#filters').addEventListener('submit',e => e.preventDefault());
  $('#search').addEventListener('input',filterResources);
  $('#age').addEventListener('change',filterResources);
  $('#area').addEventListener('change',filterResources);
  $('#clear-filters').addEventListener('click',() => {
    $('#filters').reset(); selectedCategory = 'All support';
    document.querySelectorAll('.chip').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.category === selectedCategory)));
    filterResources(); $('#search').focus();
  });
  try {
    const response = await fetch('data/resources.json?v=54e577134ce5'); if (!response.ok) throw new Error('Resource data unavailable');
    resources = await response.json();
    $('#categories').innerHTML = CATEGORY_NAMES.map(name => `<button type="button" class="chip" data-category="${escapeHTML(name)}" aria-pressed="${name === selectedCategory}">${escapeHTML(name)}</button>`).join('');
    $('#categories').addEventListener('click',event => {
      const button = event.target.closest('[data-category]'); if (!button) return;
      selectedCategory = button.dataset.category;
      document.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
      filterResources();
    });
    [...new Set(resources.map(r => r.area))].sort().forEach(area => { const option = document.createElement('option'); option.value = area; option.textContent = area; $('#area').append(option); });
    filterResources();
    setView('map');
    const nomination = new URLSearchParams(window.location.search).get('nominate');
    if (nomination === 'self' || nomination === 'other') {
      openContact(nomination,null,document.querySelector(`[data-nominate="${nomination}"]`));
      const url = new URL(window.location.href); url.searchParams.delete('nominate'); history.replaceState(null,'',url);
    }
  } catch {
    setView('list');
    $('#result-count').textContent = 'The resource list could not load.';
    $('#resource-list').innerHTML = `<div class="empty-results"><h3>Let’s try another way</h3><p>Refresh the page, <a href="data/resources.json">open the resource data</a>, or <a href="mailto:${TEAM_EMAIL}">email the 7x7 team about this guide</a>.</p></div>`;
  }
}
init();
