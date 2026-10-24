---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

## 教育经历

{% assign education = site.data.cv.experiences | where: "type", "教育经历" %}
{% for experience in education %}* {{ experience.period | escape }}：{{ experience.organization | escape }}，{{ experience.detail | escape }}
{% endfor %}

## 任职经历

{% assign employment = site.data.cv.experiences | where: "type", "任职经历" %}
{% for experience in employment %}* {{ experience.period | escape }}：{{ experience.organization | escape }}，{{ experience.detail | escape }}
{% endfor %}
