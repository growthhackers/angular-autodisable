angular.module('angular-autodisable', []);
/* global angular */
(function(module) {
	'use strict';

	/**
	 * @directive [autodisable]
	 * @example
	 * 		<form autodisable ng-submit="page.save()">
	 * 			<input type="text" autodisable />
	 * 			<button type="submit" autodisable ng-click="page.save()">Save</button>
	 * 		</form>
	 */
	function autodisableDirective(AutoDisable) {
		return {
			restrict: 'A',
			compile: compiler,
			require: ['?form', '?^form']
		};

		function compiler(element, attrs) {
			var autoDisable = new AutoDisable(element, attrs, attrs.autodisable);
			return autoDisable.link.bind(autoDisable);
		}
	}

	module.directive('autodisable', ['AutoDisable', autodisableDirective]);

})(angular.module('angular-autodisable'));

/* global angular */
(function(module) {
	'use strict';

	var TAG_INPUT = /^(input|textarea)$/i,
		TAG_BUTTON = /^button$/i,
		TAG_FORM = /^form$/i,

		CLS_AUTODISABLE = 'autodisable',
		CLS_LOCKED = 'autodisable-locked',
		CLS_BUSY = 'autodisable-busy',

		baseConfig = {
			lockOnComplete: true
		};

	/**
	 * @factory
	 */
	function AutoDisableFactory($parse, $q) {
		/* jshint validthis: true */
		function AutoDisable(element, attrs, options) {
			var tagName = String(element && element[0] && element[0].tagName || ''),
				type = attrs.type || '',
				isSubmit = type === 'submit',
				isInput = TAG_INPUT.test(tagName),
				isButton = TAG_BUTTON.test(tagName),
				isForm = TAG_FORM.test(tagName);

			this.options = options;
			this.type = type;

			this.isSubmit = isSubmit && (isButton || isInput);
			this.isForm = isForm;
			this.isInput = !isForm;

			this.onClick = !!attrs.ngClick;
			this.onSubmit = !!attrs.ngSubmit;
		}

		AutoDisable.prototype = {
			constructor: AutoDisable,
			link: link,
			lock: lock,
			unlock: unlock,
			busyLock: busyLock,
			busyUnlock: busyUnlock,
			initialize: initialize
		};

		function initialize() {
			// listen to ng-submit
			if (this.isForm && this.onSubmit) {
				bindEvent(this, 'submit');
			}

			// listen to ng-click on submit button
			if (this.isSubmit && this.onClick) {
				bindEvent(this, 'click');
			}

			if (this.isForm) {
				bindFormState(this);
			} else {
				bindChildState(this);
			}
		}

		function link($scope, $element, $attrs, controllers) {
			var form = this.isForm ? controllers[0] : controllers[1],
				options = this.options;

			form.$busy = form.$disabled = false;

			angular.extend(this, {
				scope: $scope,
				element: $element,
				attrs: $attrs,
				form: form,
				options: angular.isString(options) && $scope.$eval(options) || {}
			});

			$element.addClass(CLS_AUTODISABLE);

			this.initialize();
		}

		function busyLock(promise) {
			var self = this;

			if (self.promise) return;

			self.element.addClass(CLS_BUSY);

			// at form or submit button, bind to promise
			// otherwise, just lock the field
			if (promise) {
				self.promise = promise.then(function(response) {
					self.busyUnlock(true);
					return response;
				}, function(error) {
					self.busyUnlock(false);
					return $q.reject(error);
				});
			}

			if (this.isForm) {
				setFormBusy(self, true);
			} else {
				setInputDisable(self, true);
			}
		}

		function busyUnlock(success) {
			this.element.removeClass(CLS_BUSY);
			this.promise = null;

			if (this.isForm) {
				setFormBusy(this, false);

				if (success && baseConfig.lockOnComplete) {
					this.form.$setPristine();
				}
			} else {
				setInputDisable(this, false);
			}
		}

		function setFormBusy(self, value) {
			self.form.$busy = value;
			setFormDisable(self, value);
		}

		function lock() {
			if (this.locked) return;

			this.locked = true;
			this.element.addClass(CLS_LOCKED);

			if (this.isForm) {
				setFormDisable(this, true);
			} else if (this.isSubmit) {
				setInputDisable(this, true);
			} else {
				setInputDisable(this, false);
			}
		}

		function unlock() {
			if (!this.locked) return;

			this.locked = false;
			this.element.removeClass(CLS_LOCKED);

			if (this.isForm) {
				setFormDisable(this, false);
			} else {
				setInputDisable(this, false);
			}
		}

		function setFormDisable(self, value) {
			self.form.$disabled = value;
		}

		function setInputDisable(self, value) {
			self.attrs.$set('disabled', value);
		}

		// helper functions
		function bindEvent(self, eventName) {
			var attributeName = 'ng' + eventName.charAt(0).toUpperCase() + eventName.slice(1),
				fn = $parse(self.attrs[attributeName], /* interceptorFn */ null, /* expensiveChecks */ true);

			self.element.unbind(eventName).bind(eventName, handler);

			function handler($event) {
				if (self.locked || self.promise) return;

				var result = fn(self.scope, {
					$event: $event
				});

				if (isPromise(result)) {
					self.busyLock(result);
				}

				self.scope.$apply();
			}
		}

		function bindStateTrigger(self, watcher, trigger) {
			var form = self.form || false;
			if (!form) return;
			self.scope.$watch(watcher, trigger);
		}

		/**
		 * Lock/unlock the form
		 */
		function bindFormState(self) {
			var form = self.form;
			bindStateTrigger(self, isInvalid, updateLockOnForm);

			function isInvalid() {
				return form.$pristine + '' + form.$invalid;
			}

			function updateLockOnForm() {
				if (
					(form.$pristine && self.options.pristine !== false) ||
					(form.$invalid && self.options.invalid !== false)
				) {
					self.lock();
					return;
				}

				self.unlock();
			}
		}

		function bindChildState(self) {
			var form = self.form;

			bindStateTrigger(self, isFormDisabled, updateChildDisabled);
			bindStateTrigger(self, isFormBusy, updateChildBusy);

			function isFormDisabled() {
				return form.$disabled;
			}

			function isFormBusy() {
				return form.$busy;
			}

			function updateChildDisabled() {
				if (form.$disabled && !form.$busy) {
					self.lock();
				} else {
					self.unlock();
				}
			}

			function updateChildBusy() {
				if (form.$busy) {
					self.busyLock();
				} else {
					self.busyUnlock();
				}
			}
		}

		function isPromise(value) {
			return Boolean(value && typeof value.then === 'function' &&
				typeof value.finally === 'function');
		}

		return AutoDisable;
	}

	module.provider('AutoDisable', function() {
		this.$get = ['$parse', '$q', AutoDisableFactory];
		this.config = function(config) {
			angular.extend(baseConfig, config);
		};
	});

})(angular.module('angular-autodisable'));
