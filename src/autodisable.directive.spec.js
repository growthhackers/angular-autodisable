'use strict';

describe('autodisable directive', function() {

	beforeEach(module('angular-autodisable'));

	var compile, flush;

	beforeEach(inject(function($rootScope, $compile) {
		compile = function(template) {
			var el = $compile(template)($rootScope);
			$rootScope.$digest();

			return el;
		};

		flush = function() {
			$rootScope.$digest();
		};
	}));

	describe('disable form submission if there is a promise waiting in the submit event handler', function() {
		it('should not fire the handler twice while the promise is waiting', inject(function($rootScope, $q) {
			var template = '<form autodisable ng-submit="onsubmit()">' +
				'<input type="text" autodisable ng-model="foo" />' +
				'<button type="submit" autodisable>OK</button>' +
				'</form>',

				count = 0,
				element = compile(template),
				deferred = $q.defer(),
				form = element.data('$formController'),
				button = element.find('button'),
				input = element.find('input');

			expect(count).toBe(0);

			// autolock
			expect(element.hasClass('autodisable')).toBe(true);
			expect(element.hasClass('autodisable-locked')).toBe(true);
			expect(element.hasClass('autodisable-busy')).toBe(false);

			// auto lock children on startup
			expect(button.attr('disabled')).toBe('disabled');
			expect(button.hasClass('autodisable-locked')).toBe(true);
			expect(button.hasClass('autodisable-busy')).toBe(false);

			expect(input.attr('disabled')).not.toBe('disabled');
			expect(input.hasClass('autodisable-locked')).toBe(true);
			expect(input.hasClass('autodisable-busy')).toBe(false);


			$rootScope.onsubmit = function() {
				count++;
				return deferred.promise;
			};

			form.$setDirty();
			flush();

			/**
			 * Submit the form
			 */
			element.triggerHandler('submit');
			expect(count).toBe(1);

			expect(element.hasClass('autodisable')).toBe(true);
			expect(element.hasClass('autodisable-locked')).toBe(false);
			expect(element.hasClass('autodisable-busy')).toBe(true);

			// auto locked on submit
			expect(button.attr('disabled')).toBe('disabled');
			expect(button.hasClass('autodisable-locked')).toBe(false);
			expect(button.hasClass('autodisable-busy')).toBe(true);

			// inputs are locked as well
			expect(input.attr('disabled')).toBe('disabled');
			expect(input.hasClass('autodisable-locked')).toBe(false);
			expect(input.hasClass('autodisable-busy')).toBe(true);

			/**
			 * Another submission must be ignored
			 */
			element.triggerHandler('submit');
			expect(count).toBe(1);

			deferred.resolve();
			flush();

			/**
			 * The promise is now resolved. Unlock the form
			 */
			expect(element.hasClass('autodisable')).toBe(true);
			expect(element.hasClass('autodisable-locked')).toBe(false);
			expect(element.hasClass('autodisable-busy')).toBe(false);

			// unlocked when the submission ends
			expect(button.attr('disabled')).not.toBe('disabled');
			expect(button.hasClass('autodisable-locked')).toBe(false);
			expect(button.hasClass('autodisable-busy')).toBe(false);

			// inputs are unlocked as well
			expect(input.attr('disabled')).not.toBe('disabled');
			expect(input.hasClass('autodisable-locked')).toBe(false);
			expect(input.hasClass('autodisable-busy')).toBe(false);

			element.triggerHandler('submit');
			expect(count).toBe(2);
		}));

		it('should autolock if the form is invalid or pristine', inject(function($rootScope) {
			var template = '<form autodisable ng-submit="onsubmit()"></form>',
				element = compile(template),
				count = 0;

			$rootScope.onsubmit = function() {
				count++;
			};

			element.triggerHandler('submit');
			expect(count).toBe(0);
		}));

		it('should lock the child nodes when the parent is locked', inject(function() {
			var template = '<form autodisable ng-submit="onsubmit()">' +
				'<input type="text" autodisable ng-model="foo" />' +
				'<button type="submit" autodisable>OK</button>' +
				'</form>',

				element = compile(template);

			var button = element.find('button'),
				input = element.find('input');

			// auto locked due to form state being pristine
			expect(button.attr('disabled')).toBe('disabled');
			expect(button.hasClass('autodisable-locked')).toBe(true);
			expect(button.hasClass('autodisable-busy')).toBe(false);

			// has the class but won't be disabled, otherwise the form
			// would be unusable
			expect(input.attr('disabled')).not.toBe('disabled');
			expect(input.hasClass('autodisable-locked')).toBe(true);
			expect(input.hasClass('autodisable-busy')).toBe(false);
		}));

		it('should unlock the child nodes when the parent is unlocked', inject(function() {
			var template = '<form autodisable ng-submit="onsubmit()">' +
				'<input type="text" autodisable ng-model="foo" />' +
				'<button type="submit" autodisable>OK</button>' +
				'</form>',

				element = compile(template),
				form = element.data('$formController');

			form.$setDirty();
			flush();

			expect(element.find('button').attr('disabled')).not.toBe('disabled');
			expect(element.find('input').attr('disabled')).not.toBe('disabled');
		}));
	});
});
