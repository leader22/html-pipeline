
/**
 * Module Dependencies
 */

var iterator = require('dom-iterator');

/**
 * Export `HTMLPipeline`
 */

module.exports = HTMLPipeline;

/**
 * Initialize `HTMLPipeline`
 * If you run in node, pass document by your own
 *
 * @param {DocumentElement} $document
 * @return {HTMLPipeline}
 * @api public
 */

function HTMLPipeline($document) {
  this.$document = $document || document;
  this.pipes = [];
  // Set it later(at #run)
  this.it = null;

  if (!(this instanceof HTMLPipeline)) return new HTMLPipeline($document);
}

/**
 * Add a transform to the pipe
 *
 * @param {Function} fn
 * @return {HTMLPipeline} self
 * @api public
 */

HTMLPipeline.prototype.pipe = function(fn) {
  this.pipes.push(fn);
  return this;
};

/**
 * Run the pipeline
 *
 * @param {Element} el
 * @return {HTMLPipeline}
 * @api public
 */

HTMLPipeline.prototype.run = function(el) {
  this.it = iterator(el.firstChild, el).revisit(false);

  var pipes = this.pipes;
  var len = pipes.length;
  var next = this.it.node;
  var it = this.it;
  var $document = this.$document;
  var parent;
  var child;
  var skip;
  var ret;
  var i;

  while (next) {
    parent = next.parentNode;
    skip = false;

    for (i = 0; i < len; i++) {
      ret = pipes[i](next);

      // ignore, remove, unwrap, or replace
      // depending on what is returned.
      if (undefined === ret) {
        // ignore and continue with
        // the rest of the transforms
        continue;
      } else if (null === ret) {
        // once we've removed the node,
        // skip over the other transforms
        it.reset(next.previousSibling || next.parentNode);
        parent.removeChild(next);
        break;
      } else if (false == ret) {
        // once we've unwrapped the node,
        // skip over the other transforms
        // and start on the first child
        // that was unwrapped
        it.reset(next.previousSibling || next.parentNode);
        ret = unwrap(next, $document);
        parent.replaceChild(ret, next);
        break;
      } else if (next == ret) {
        next = next.nextSibling || next.parentNode;
        it.reset(next);
        skip = true;
        break;
      } else if ('string' == typeof ret || 'number' == typeof ret) {
        // replace the node with a textnode
        // set the current node to the
        // replacement and continue
        ret = document.createTextNode(ret);
        parent.replaceChild(ret, next);
        it.reset(ret);
        next = ret;
      } else if (1 == ret.nodeType) {
        // replace the node with an element
        // set the current node to the
        // replacement and continue
        parent.replaceChild(ret, next);
        it.reset(ret);
        next = ret;
      } else if (11 == ret.nodeType) {
        // replace the node with a document
        // fragment. set the current node
        // to the fragment's first child
        // and continue.
        child = ret.firstChild;
        parent.replaceChild(ret, next);
        it.reset(child);
        next = child;
      }
    }

    next = skip ? next : it.next();
  }

  // cleanup the split textnodes
  if (el.normalize) el.normalize();

  return el;
};

/**
 * Unwrap an element
 *
 * @param {Element} el
 * @param {DocumentElement} $document
 * @return {DocumentFragment} frag
 */

function unwrap(el, $document) {
  var frag = $document.createDocumentFragment();
  while (el.childNodes.length) {
    frag.appendChild(el.firstChild);
  }
  return frag;
}
