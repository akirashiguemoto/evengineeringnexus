(function () {
  // Render blog cards based on the data defined in blog-posts.js.
  const grid = document.querySelector('[data-blog-grid]');
  if (!grid) {
    return;
  }

  const emptyState = document.querySelector('.blog-empty');
  const posts = Array.isArray(window.blogPosts) ? window.blogPosts : [];
  const maxItems = parseInt(grid.getAttribute('data-blog-max') || posts.length, 10);
  const itemsToRender = posts.slice(0, isNaN(maxItems) ? posts.length : maxItems);

  if (itemsToRender.length === 0) {
    if (emptyState) {
      emptyState.hidden = false;
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  itemsToRender.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'blog-card';

    if (post.image) {
      const imageLink = document.createElement('a');
      imageLink.className = 'blog-card__image';
      imageLink.href = post.url || '#';
      applyLinkBehavior(imageLink, post);

      const img = document.createElement('img');
      img.src = post.image;
      img.alt = post.alt || post.title || 'Blog post image';
      imageLink.appendChild(img);
      article.appendChild(imageLink);
    }

    const body = document.createElement('div');
    body.className = 'blog-card__body';

    if (post.category) {
      const category = document.createElement('span');
      category.className = 'blog-card__category';
      category.textContent = post.category;
      body.appendChild(category);
    }

    if (post.title) {
      const title = document.createElement('h3');
      const titleLink = document.createElement('a');
      titleLink.className = 'blog-card__title';
      titleLink.href = post.url || '#';
      titleLink.textContent = post.title;
      applyLinkBehavior(titleLink, post);
      title.appendChild(titleLink);
      body.appendChild(title);
    }

    if (post.excerpt) {
      const excerpt = document.createElement('p');
      excerpt.className = 'blog-card__excerpt';
      excerpt.textContent = post.excerpt;
      body.appendChild(excerpt);
    }

    const metaBits = [];
    if (post.date) {
      metaBits.push(post.date);
    }
    if (post.readTime) {
      metaBits.push(post.readTime);
    }
    if (post.author) {
      metaBits.push(post.author);
    }

    if (metaBits.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'blog-card__meta';
      meta.textContent = metaBits.join(' • ');
      body.appendChild(meta);
    }

    article.appendChild(body);
    fragment.appendChild(article);
  });

  grid.appendChild(fragment);

  function applyLinkBehavior(link, post) {
    if (!link || !post) {
      return;
    }

    let relValue = '';

    if (post.external || post.target === '_blank') {
      link.target = '_blank';
      relValue = 'noopener';
    } else if (post.target) {
      link.target = post.target;
    }

    if (post.rel) {
      relValue = relValue ? relValue + ' ' + post.rel : post.rel;
    }

    if (relValue) {
      link.rel = relValue;
    }
  }
})();
