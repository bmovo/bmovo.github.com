(function () {
  "use strict";

  var search = document.querySelector("[data-blog-search]");
  if (!search) return;

  var input = search.querySelector("input");
  var clear = search.querySelector("button");
  var status = search.querySelector("[role='status']");
  var results = search.querySelector(".blog-search__results");
  var archive = document.getElementById("blog-archive");
  var indexPromise;
  var requestVersion = 0;
  var debounce;
  var composing = false;

  function plainText(value) {
    // Jekyll strips tags but preserves HTML entities. Decode in an inert document;
    // all visible content is subsequently inserted with textContent.
    return new DOMParser().parseFromString(String(value || ""), "text/html")
      .documentElement.textContent.replace(/\s+/g, " ").trim();
  }

  function normalize(value) {
    return value.normalize("NFKC").toLowerCase();
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(search.getAttribute("data-index-url"))
        .then(function (response) {
          if (!response.ok) throw new Error("Search index unavailable");
          return response.json();
        })
        .then(function (posts) {
          return posts.map(function (post) {
            var title = plainText(post.title);
            var content = plainText(post.content);
            var tags = plainText(post.tags);
            var categories = plainText(post.categories);
            return {
              title: title,
              content: content,
              url: post.url,
              date: post.date,
              titleText: normalize(title),
              metadataText: normalize(tags + " " + categories),
              text: normalize(title + " " + content + " " + tags + " " + categories)
            };
          });
        })
        .catch(function (error) {
          indexPromise = null; // A later query can retry a failed request.
          throw error;
        });
    }
    return indexPromise;
  }

  function snippet(post, terms) {
    var text = normalize(post.content);
    var match = -1;
    terms.forEach(function (term) {
      var position = text.indexOf(term);
      if (position !== -1 && (match === -1 || position < match)) match = position;
    });
    var start = Math.max(0, match - 40);
    var excerpt = post.content.slice(start, start + 180);
    return (start > 0 ? "…" : "") + excerpt + (start + 180 < post.content.length ? "…" : "");
  }

  function render(matches, terms) {
    var fragment = document.createDocumentFragment();
    matches.forEach(function (match) {
      var post = match.post;
      var article = document.createElement("article");
      article.className = "blog-search__result";
      var heading = document.createElement("h2");
      heading.className = "archive__item-title";
      var link = document.createElement("a");
      link.href = post.url;
      link.textContent = post.title;
      heading.appendChild(link);
      article.appendChild(heading);
      var date = document.createElement("time");
      date.className = "blog-search__date";
      date.dateTime = post.date;
      date.textContent = post.date;
      article.appendChild(date);
      var excerpt = document.createElement("p");
      excerpt.className = "archive__item-excerpt";
      excerpt.textContent = snippet(post, terms);
      article.appendChild(excerpt);
      fragment.appendChild(article);
    });
    results.replaceChildren(fragment);
    results.hidden = false;
    archive.hidden = true;
    status.textContent = matches.length ? "找到 " + matches.length + " 篇相关文章。" : "没有找到相关文章，请试试其他关键词。";
  }

  function update() {
    var version = ++requestVersion;
    var query = normalize(input.value.trim());
    clear.disabled = input.value.length === 0;
    if (!query) {
      status.textContent = "";
      results.replaceChildren();
      results.hidden = true;
      archive.hidden = false;
      return;
    }

    var terms = query.split(/\s+/);
    status.textContent = "正在搜索…";
    results.hidden = true;
    // Keep the original archive available while loading and if loading fails.
    archive.hidden = false;
    loadIndex().then(function (posts) {
      if (version !== requestVersion) return;
      var matches = [];
      posts.forEach(function (post, order) {
        if (!terms.every(function (term) { return post.text.indexOf(term) !== -1; })) return;
        var score = 0;
        terms.forEach(function (term) {
          if (post.titleText.indexOf(term) !== -1) score += 3;
          if (post.metadataText.indexOf(term) !== -1) score += 2;
        });
        matches.push({ post: post, score: score, order: order });
      });
      matches.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
      render(matches, terms);
    }).catch(function () {
      if (version !== requestVersion) return;
      status.textContent = "搜索暂时不可用，请稍后重试。你仍可浏览下方文章。";
      results.hidden = true;
      archive.hidden = false;
    });
  }

  function schedule() {
    clearTimeout(debounce);
    ++requestVersion; // Invalidate in-flight results as soon as the query changes.
    clear.disabled = input.value.length === 0;
    if (!composing) debounce = setTimeout(update, 150);
  }

  search.querySelector("form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!composing) {
      clearTimeout(debounce);
      update();
    }
  });
  input.addEventListener("input", schedule);
  input.addEventListener("compositionstart", function () {
    composing = true;
    clearTimeout(debounce);
    ++requestVersion;
  });
  input.addEventListener("compositionend", function () {
    composing = false;
    schedule();
  });
  clear.addEventListener("click", function () {
    clearTimeout(debounce);
    input.value = "";
    update();
    input.focus();
  });
  search.hidden = false;
})();
