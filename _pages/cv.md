---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

<section class="cv-timeline" aria-label="教育与任职经历">
  <ol class="cv-timeline__list" role="list">
    {% for experience in site.data.cv.experiences %}
    <li class="cv-timeline__item">
      <article class="cv-timeline__card">
        <div class="cv-timeline__meta">
          <span class="cv-timeline__period">{{ experience.period | escape }}</span>
          <span class="cv-timeline__type">{{ experience.type | escape }}</span>
        </div>
        <h2 class="cv-timeline__description"><span class="cv-timeline__organization">{{ experience.organization | escape }}</span><span class="cv-timeline__separator">@</span><span class="cv-timeline__detail">{{ experience.detail | escape }}</span></h2>
      </article>
    </li>
    {% endfor %}
  </ol>
</section>
